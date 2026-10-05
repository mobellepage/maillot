// Creates (or resumes) a Stripe Checkout Session (card + TWINT) for a
// pending_payment order. Inert-by-design: without STRIPE_SECRET_KEY it
// answers { configured: false } so the app keeps working, payments off.
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HOUR_MS = 60 * 60 * 1000;
const PAYMENT_WINDOW_MS = 24 * HOUR_MS; // public.order_policy().payment_hours

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

// Redirect targets come from APP_URL when configured; otherwise the caller's
// Origin, but only if it's an http(s) origin (never an arbitrary scheme).
function appOrigin(req: Request) {
  const configured = Deno.env.get("APP_URL");
  if (configured) return configured.replace(/\/$/, "");
  const origin = req.headers.get("origin") ?? "";
  return /^https?:\/\/[^/]+$/.test(origin) ? origin : "http://localhost:5173";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    return json({
      configured: false,
      message: "Payments are not switched on yet. Set STRIPE_SECRET_KEY as a Supabase Edge Function secret to enable checkout.",
    });
  }

  let orderId: string | undefined;
  try {
    orderId = (await req.json())?.orderId;
  } catch {
    return json({ configured: true, error: "Invalid JSON body" }, 400);
  }
  if (!orderId) return json({ configured: true, error: "orderId is required" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json({ configured: true, error: "Not authenticated" }, 401);

  // RLS only returns the order to its buyer or seller; we additionally assert buyer.
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, buyer_id, shirt_id, size, amount, auth_fee, shipping_fee, status, stripe_checkout_session_id, created_at")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) return json({ configured: true, error: "Order not found" }, 404);
  if (order.buyer_id !== user.id) return json({ configured: true, error: "Only the buyer can pay for this order" }, 403);
  if (order.status !== "pending_payment") return json({ configured: true, error: `Order is not payable in status "${order.status}"` }, 409);

  // The order expires PAYMENT_WINDOW after the match (run_order_lifecycle), so
  // no checkout session may outlive it. Stripe needs >= 30 min per session.
  const deadline = new Date(order.created_at).getTime() + PAYMENT_WINDOW_MS;
  if (deadline - Date.now() < 31 * 60 * 1000) {
    return json({ configured: true, error: "The payment window for this order has closed" }, 409);
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

  // Resume an existing open session instead of minting a new one on every
  // click — avoids duplicate sessions (and double charges) for one order.
  if (order.stripe_checkout_session_id) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
      if (existing.status === "open" && existing.url) return json({ configured: true, url: existing.url });
    } catch { /* fall through and create a fresh one */ }
  }

  // Parameters must be identical for a given idempotency key, so expiry is
  // derived from the hour bucket rather than from "now".
  const bucket = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
  const total = Number(order.amount) + Number(order.auth_fee) + Number(order.shipping_fee);
  const origin = appOrigin(req);
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card", "twint"],
      currency: "chf",
      customer_email: user.email ?? undefined,
      // The centre forwards the shirt here after authentication.
      shipping_address_collection: { allowed_countries: ["CH", "LI"] },
      line_items: [{
        price_data: {
          currency: "chf",
          unit_amount: Math.round(total * 100),
          product_data: {
            name: `${order.shirt_id} · Size ${order.size}`,
            description: "Maillot order — authentication + insured shipping included, held in escrow until you confirm delivery",
          },
        },
        quantity: 1,
      }],
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
      expires_at: Math.floor(Math.min(bucket + 2 * HOUR_MS, deadline) / 1000),
      success_url: `${origin}/orders?checkout=success&order=${order.id}`,
      cancel_url: `${origin}/orders?checkout=cancel&order=${order.id}`,
    },
    { idempotencyKey: `checkout-${order.id}-${bucket}` },
  );

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await service.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);

  return json({ configured: true, url: session.url });
});
