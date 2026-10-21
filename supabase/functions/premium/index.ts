// Premium subscription (unlimited shirts): starts a Stripe Checkout for the
// monthly or yearly plan, or opens Stripe's customer portal to manage or
// cancel it. Premium itself is switched on by stripe-webhook from the
// subscription events, never here. Inert-by-design: without STRIPE_SECRET_KEY
// and the two price ids it answers { configured: false } (the app then
// offers the waitlist).
//
//   POST { action: "checkout", interval: "month" | "year", app?: boolean } → { url }
//   POST { action: "portal", app?: boolean } → { url }
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

// Same rule as checkout: back to our own site (or localhost), never elsewhere.
function returnUrl(req: Request, path: string, app: boolean) {
  const site = (Deno.env.get("APP_URL") || "https://maillot.app").replace(/\/$/, "");
  if (app) return `${site}/return?to=${encodeURIComponent(path)}`;
  const origin = req.headers.get("origin") ?? "";
  const ours = origin === site || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || /^https:\/\/maillot-[a-z0-9-]+\.vercel\.app$/.test(origin);
  return (ours ? origin : site) + path;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  // Read the body first: answering before it is consumed stalls the runtime.
  let body: { action?: string; interval?: string; app?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const key = Deno.env.get("STRIPE_SECRET_KEY");
  const prices: Record<string, string | undefined> = {
    month: Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE"),
    year: Deno.env.get("STRIPE_PREMIUM_YEARLY_PRICE"),
  };
  if (!key || !prices.month || !prices.year) return json({ configured: false });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ configured: true, error: "Not authenticated" }, 401);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: profile } = await service.from("profiles").select("stripe_customer_id, premium_until").eq("id", user.id).maybeSingle();
  const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  const app = body.app === true;

  if (body.action === "portal") {
    if (!profile?.stripe_customer_id) return json({ configured: true, error: "No subscription yet" }, 409);
    const portal = await stripe.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: returnUrl(req, "/premium", app) });
    return json({ configured: true, url: portal.url });
  }

  const price = body.interval === "year" ? prices.year : body.interval === "month" ? prices.month : undefined;
  if (!price) return json({ configured: true, error: "interval must be month or year" }, 400);
  if (profile?.premium_until && new Date(profile.premium_until) > new Date()) return json({ configured: true, already: true });

  // One Stripe customer per member, remembered on the profile.
  let customer = profile?.stripe_customer_id ?? null;
  if (!customer) {
    const created = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } }, { idempotencyKey: `premium-customer-${user.id}` });
    customer = created.id;
    await service.from("profiles").update({ stripe_customer_id: customer }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { kind: "premium", user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: returnUrl(req, "/premium?welcome=1", app),
    cancel_url: returnUrl(req, "/premium", app),
  });
  return json({ configured: true, url: session.url });
});
