// Moves the money for escrow outcomes (Stripe Connect, separate charges and
// transfers). Triggered by the orders_request_settlement DB trigger with
// { order_id }, or by stripe-webhook with { seller_id } once a seller has
// finished payout onboarding. Safe to call by anyone: it re-reads the order
// with the service role and only does what the database state calls for,
// and every Stripe call is idempotent per order, so retries can't pay twice.
// Inert until STRIPE_SECRET_KEY is set.
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.0.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return json({ configured: false });

  let body: { order_id?: string; seller_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });

  let ids: string[] = [];
  if (body.order_id && UUID.test(body.order_id)) ids = [body.order_id];
  else if (body.seller_id && UUID.test(body.seller_id)) {
    const { data } = await db.from("orders").select("id").eq("seller_id", body.seller_id).eq("status", "released").in("payout_status", ["pending", "awaiting_onboarding", "failed"]);
    ids = (data || []).map((o) => o.id);
  } else return json({ error: "order_id or seller_id required" }, 400);

  const results: Record<string, string> = {};
  for (const id of ids) results[id] = await settle(db, stripe, id);
  return json({ configured: true, results });
});

// deno-lint-ignore no-explicit-any
async function settle(db: any, stripe: Stripe, orderId: string): Promise<string> {
  const { data: o } = await db
    .from("orders")
    .select("id, status, amount, commission, seller_id, stripe_payment_intent_id, payout_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return "not_found";

  // ---- seller payout on release -------------------------------------------
  if (o.status === "released" && ["pending", "awaiting_onboarding", "failed"].includes(o.payout_status)) {
    const { data: seller } = await db.from("profiles").select("stripe_account_id, payouts_enabled").eq("id", o.seller_id).maybeSingle();
    if (!seller?.stripe_account_id || !seller.payouts_enabled) {
      await db.from("orders").update({ payout_status: "awaiting_onboarding" }).eq("id", o.id);
      return "awaiting_onboarding";
    }
    if (!o.stripe_payment_intent_id) {
      await db.from("orders").update({ payout_status: "failed", settlement_error: "no payment on record" }).eq("id", o.id);
      return "failed";
    }
    try {
      const pi = await stripe.paymentIntents.retrieve(o.stripe_payment_intent_id);
      const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
      const payout = Math.round((Number(o.amount) - Number(o.commission)) * 100);
      const transfer = await stripe.transfers.create(
        { amount: payout, currency: "chf", destination: seller.stripe_account_id, transfer_group: o.id, ...(charge ? { source_transaction: charge } : {}), metadata: { order_id: o.id } },
        { idempotencyKey: "payout-" + o.id }
      );
      await db.from("orders").update({ payout_status: "paid", payout_transfer_id: transfer.id, settled_at: new Date().toISOString(), settlement_error: null }).eq("id", o.id);
      return "paid";
    } catch (e) {
      await db.from("orders").update({ payout_status: "failed", settlement_error: String((e as Error).message).slice(0, 500) }).eq("id", o.id);
      return "failed";
    }
  }

  // ---- buyer refund on refunded dispute -------------------------------------
  if (o.status === "refunded" && ["refund_pending", "refund_failed"].includes(o.payout_status)) {
    if (!o.stripe_payment_intent_id) {
      // Never paid through Stripe (e.g. test data): nothing to refund.
      await db.from("orders").update({ payout_status: "refunded", settled_at: new Date().toISOString() }).eq("id", o.id);
      return "refunded";
    }
    try {
      const refund = await stripe.refunds.create({ payment_intent: o.stripe_payment_intent_id, metadata: { order_id: o.id } }, { idempotencyKey: "refund-" + o.id });
      await db.from("orders").update({ payout_status: "refunded", refund_id: refund.id, settled_at: new Date().toISOString(), settlement_error: null }).eq("id", o.id);
      return "refunded";
    } catch (e) {
      await db.from("orders").update({ payout_status: "refund_failed", settlement_error: String((e as Error).message).slice(0, 500) }).eq("id", o.id);
      return "refund_failed";
    }
  }
  return "nothing_to_do";
}
