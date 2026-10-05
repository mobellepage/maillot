// Stripe webhook receiver. Authenticated via Stripe-Signature (not a Supabase
// JWT), so verify_jwt is off — signature verification is the auth boundary.
// Inert-by-design until STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are set.
//
// An order only moves to paid_escrow when Stripe says the money is actually
// captured (payment_status === "paid") AND the captured amount/currency
// match what the order says is owed. Notifications are emitted by the
// on_order_status_change DB trigger — never inserted here, so nobody is
// notified twice. A payment that lands after the order expired is refunded.
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.0.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeSecretKey || !webhookSecret) return json({ configured: false });

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-12-18.acacia" });
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing Stripe-Signature header");
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  // Connected account finished (or lost) payout onboarding: mirror the flag
  // and release any payouts that were waiting for it.
  if (event.type === "account.updated") {
    const acct = event.data.object as Stripe.Account;
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await service.from("profiles").update({ payouts_enabled: !!acct.payouts_enabled }).eq("stripe_account_id", acct.id).select("id").maybeSingle();
    if (profile && acct.payouts_enabled) {
      await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/settle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seller_id: profile.id }) }).catch(() => {});
    }
    return json({ received: true });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return json({ received: true, pending: true });

  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) return json({ received: true, error: "no order reference" });

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await service
    .from("orders")
    .select("id, amount, auth_fee, shipping_fee, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return json({ received: true, error: "order not found" });

  const expectedCents = Math.round((Number(order.amount) + Number(order.auth_fee) + Number(order.shipping_fee)) * 100);
  if (session.amount_total !== expectedCents || (session.currency ?? "").toLowerCase() !== "chf") {
    console.error(`[stripe-webhook] amount mismatch for order ${orderId}: got ${session.amount_total} ${session.currency}, expected ${expectedCents} chf`);
    return json({ received: true, error: "amount mismatch" });
  }

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  const { data: updated } = await service
    .from("orders")
    .update({
      status: "paid_escrow",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntent,
    })
    .eq("id", orderId)
    .eq("status", "pending_payment")
    .select("id");
  if (updated?.length) return json({ received: true });

  // Not payable any more. If the order expired (run_order_lifecycle cancelled
  // it, possibly a moment ago) the shirt may be gone, so the money goes back.
  // Any other status means this event is a duplicate of one already applied.
  const { data: now } = await service.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (now?.status === "cancelled" && paymentIntent) {
    await stripe.refunds.create({ payment_intent: paymentIntent, metadata: { order_id: orderId, reason: "late_payment" } }, { idempotencyKey: `late-payment-${session.id}` });
    console.warn(`[stripe-webhook] late payment for cancelled order ${orderId} refunded`);
    return json({ received: true, refunded: true });
  }
  return json({ received: true, duplicate: true });
});
