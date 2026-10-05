// Prepaid Swiss Post labels (Digital Commerce API, barcode v1).
//   inbound  — seller -> Zürich authentication centre (caller: the seller)
//   outbound — centre -> buyer, to the address Stripe collected (caller: admin)
// The PDF is stored in the private shipping-labels bucket and handed back as
// a short-lived signed URL; asking again re-signs the existing label instead
// of buying a new one. Inert until the SWISSPOST_* secrets are set.
//
// Secrets: SWISSPOST_CLIENT_ID, SWISSPOST_CLIENT_SECRET, SWISSPOST_FRANKING_LICENSE,
// AUTH_CENTRE_ADDRESS (JSON: {"name1","street","zip","city"}),
// optional SWISSPOST_SERVICE_CODES (comma list, default "PRI").
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type PostAddress = { name1: string; name2?: string; street: string; zip: string; city: string; country?: string };

async function postToken(id: string, secret: string): Promise<string> {
  const res = await fetch("https://api.post.ch/OAuth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret, scope: "DCAPI_BARCODE_READ" }),
  });
  if (!res.ok) throw new Error(`Swiss Post auth failed (${res.status})`);
  return (await res.json()).access_token;
}

async function generateLabel(token: string, license: string, customer: PostAddress, recipient: PostAddress, ref: string, services: string[]) {
  const res = await fetch("https://dcapi.apis.post.ch/barcode/v1/generateAddressLabel", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      language: "DE",
      frankingLicense: license,
      ppFranking: false,
      customer: { ...customer, country: "CH" },
      labelDefinition: { labelLayout: "A6", printAddresses: "RECIPIENT_AND_CUSTOMER", imageFileType: "PDF", imageResolution: 300, printPreview: false },
      item: { itemID: ref, recipient, attributes: { przl: services } },
    }),
  });
  if (!res.ok) throw new Error(`Swiss Post label failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const identCode: string | undefined = body?.item?.identCode;
  const pdf: string | undefined = body?.item?.label?.[0];
  if (!identCode || !pdf) throw new Error("Swiss Post returned no label");
  return { identCode, pdf: Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0)) };
}

/** Stripe Checkout shipping_details -> Swiss Post recipient. */
function fromStripe(shipTo: any): PostAddress | null {
  const a = shipTo?.address;
  if (!shipTo?.name || !a?.line1 || !a?.postal_code || !a?.city) return null;
  return { name1: String(shipTo.name).slice(0, 35), name2: a.line2 ? String(a.line2).slice(0, 35) : undefined, street: String(a.line1).slice(0, 35), zip: String(a.postal_code), city: String(a.city).slice(0, 35), country: a.country ?? "CH" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const clientId = Deno.env.get("SWISSPOST_CLIENT_ID");
  const clientSecret = Deno.env.get("SWISSPOST_CLIENT_SECRET");
  const license = Deno.env.get("SWISSPOST_FRANKING_LICENSE");
  const centreRaw = Deno.env.get("AUTH_CENTRE_ADDRESS");
  if (!clientId || !clientSecret || !license || !centreRaw) {
    return json({ configured: false, message: "Prepaid labels aren’t switched on yet — please ship with any tracked service." });
  }
  const centre = JSON.parse(centreRaw) as PostAddress;
  const services = (Deno.env.get("SWISSPOST_SERVICE_CODES") ?? "PRI").split(",").map((s) => s.trim()).filter(Boolean);

  let orderId: string | undefined, leg: "inbound" | "outbound" = "inbound";
  try {
    const body = await req.json();
    orderId = body?.orderId;
    if (body?.leg === "outbound") leg = "outbound";
  } catch {
    return json({ configured: true, error: "Invalid JSON body" }, 400);
  }
  if (!orderId) return json({ configured: true, error: "orderId is required" }, 400);

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ configured: true, error: "Not authenticated" }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await db.from("orders").select("id, seller_id, status, inspection, tracking_code, outbound_tracking, label_path").eq("id", orderId).maybeSingle();
  if (!order) return json({ configured: true, error: "Order not found" }, 404);

  if (leg === "inbound") {
    if (order.seller_id !== user.id) return json({ configured: true, error: "Only the seller can get this label" }, 403);
    if (!["paid_escrow", "shipped"].includes(order.status)) return json({ configured: true, error: "This order isn’t ready to ship" }, 409);
  } else {
    const { data: me } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!me?.is_admin) return json({ configured: true, error: "Not authorized" }, 403);
    if (order.status !== "shipped") return json({ configured: true, error: "This order isn’t at the centre" }, 409);
  }

  const path = `${order.id}/${leg}.pdf`;
  const existingTracking = leg === "inbound" ? order.tracking_code : order.outbound_tracking;
  const sign = async () => (await db.storage.from("shipping-labels").createSignedUrl(path, 600)).data?.signedUrl;

  // Already bought: hand out the same label again.
  const { data: existing } = await db.storage.from("shipping-labels").list(order.id, { search: `${leg}.pdf` });
  if (existing?.length) return json({ configured: true, url: await sign(), tracking: existingTracking });

  let recipient: PostAddress | null = centre;
  if (leg === "outbound") {
    const { data: addr } = await db.from("order_addresses").select("ship_to").eq("order_id", order.id).maybeSingle();
    recipient = fromStripe(addr?.ship_to);
    if (!recipient) return json({ configured: true, error: "No delivery address on file for this order" }, 409);
  }

  try {
    const token = await postToken(clientId, clientSecret);
    const { identCode, pdf } = await generateLabel(token, license, centre, recipient, order.id.slice(0, 8), services);
    const up = await db.storage.from("shipping-labels").upload(path, pdf, { contentType: "application/pdf", upsert: false });
    if (up.error) throw up.error;
    await db.from("orders").update(
      leg === "inbound" ? { label_path: path, tracking_code: identCode, carrier: "post" } : { outbound_tracking: identCode, outbound_carrier: "post" },
    ).eq("id", order.id);
    return json({ configured: true, url: await sign(), tracking: identCode });
  } catch (err) {
    console.error("[shipping-label]", (err as Error).message);
    return json({ configured: true, error: "Couldn’t create the label right now — please try again or ship with any tracked service." }, 502);
  }
});
