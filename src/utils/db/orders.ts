// Orders, escrow transitions, checkout and disputes.
import { sb } from '../supabase.ts';
import { isNative } from '../../lib/native.ts';
import type { RpcReturns } from '../../types/database.ts';
import type { Dispute, Order } from './types.ts';

// ---------------------------------------------------------------------------
// Orders / escrow. Clients cannot write `orders` directly (no RLS
// insert/update policy); every transition is a SECURITY DEFINER RPC that
// checks the caller's role (buyer/seller) and the current status.
// ---------------------------------------------------------------------------
export async function loadMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await (await sb()).from('orders').select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** What the buyer pays: price + authentication (only via a centre) + shipping. */
export function orderTotal(o: Pick<Order, 'amount' | 'auth_fee' | 'shipping_fee'>): number {
  return Number(o.amount) + Number(o.auth_fee || 0) + Number(o.shipping_fee || 0);
}

/** What the seller receives: price − fee, plus the shipping fee when they ship it themselves. */
export function sellerNet(o: Pick<Order, 'amount' | 'commission' | 'shipping_fee' | 'inspection'>): number {
  return Number(o.amount) - Number(o.commission) + (o.inspection === 'not_required' ? Number(o.shipping_fee || 0) : 0);
}

export type OrderPhoto = { path: string; thumbPath?: string };

/** Seller: shirt photo + carrier + tracking number are all required. */
export async function markOrderShipped(orderId: string, tracking: string, carrier: string, photos: OrderPhoto[]): Promise<void> {
  const { error } = await (await sb()).rpc('order_mark_shipped', { p_order_id: orderId, p_tracking: tracking, p_carrier: carrier, p_photos: photos });
  if (error) throw error;
}

/** Buyer: the parcel arrived (starts the release clock). */
export async function markOrderDelivered(orderId: string): Promise<void> {
  const { error } = await (await sb()).rpc('order_mark_delivered', { p_order_id: orderId });
  if (error) throw error;
}

/** The buyer's delivery address (Stripe Checkout), readable by the seller while they ship. */
export type ShipTo = { name?: string; address?: { line1?: string; line2?: string | null; postal_code?: string; city?: string; country?: string } };
export async function loadShipTo(orderId: string): Promise<ShipTo | null> {
  const { data, error } = await (await sb()).from('order_addresses').select('ship_to').eq('order_id', orderId).maybeSingle();
  if (error) throw error;
  return (data?.ship_to as ShipTo | undefined) ?? null;
}

export type LabelResult = { configured: false; message?: string } | { configured: true; url?: string; tracking?: string; error?: string };

/** Prepaid Swiss Post label: inbound (seller -> buyer, or -> centre) or outbound (centre -> buyer, admins). */
export async function requestShippingLabel(orderId: string, leg: 'inbound' | 'outbound' = 'inbound'): Promise<LabelResult> {
  const { data, error } = await (await sb()).functions.invoke<LabelResult>('shipping-label', { body: { orderId, leg } });
  if (error) throw error;
  if (!data) throw new Error('empty response');
  return data;
}

/** Buyer: confirms with a photo of the shirt they received; releases the payment. */
export async function confirmOrderReceipt(orderId: string, photos: OrderPhoto[]): Promise<void> {
  const { error } = await (await sb()).rpc('order_confirm_receipt', { p_order_id: orderId, p_photos: photos });
  if (error) throw error;
}

export async function cancelOrder(orderId: string): Promise<void> {
  const { error } = await (await sb()).rpc('order_cancel', { p_order_id: orderId });
  if (error) throw error;
}

export type CheckoutResult = { configured: false; message?: string } | { configured: true; url?: string; error?: string };

// Starts (or resumes) a Stripe Checkout Session via the "checkout" edge
// function. { configured: false } means payments aren't switched on yet.
export async function createCheckoutSession(orderId: string): Promise<CheckoutResult> {
  const { data, error } = await (await sb()).functions.invoke<CheckoutResult>('checkout', { body: { orderId, app: isNative() } });
  if (error) throw error;
  if (!data) throw new Error('empty checkout response');
  return data;
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------
// Atomically flips the order to 'disputed' and records who opened it.
export async function openDispute(orderId: string, reason: string): Promise<string> {
  const { data, error } = await (await sb()).rpc('order_open_dispute', { p_order_id: orderId, p_reason: reason });
  if (error) throw error;
  return data;
}

export async function loadDisputesForOrder(orderId: string): Promise<Dispute[]> {
  const { data, error } = await (await sb()).from('disputes').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export type AdminDispute = RpcReturns<'list_disputes_for_admin'>[number];

// Admin resolution queue — both RPCs are SECURITY DEFINER and re-check
// is_admin server-side.
export async function loadDisputesForAdmin(): Promise<AdminDispute[]> {
  const { data, error } = await (await sb()).rpc('list_disputes_for_admin');
  if (error) throw error;
  return data || [];
}

export async function resolveDispute(disputeId: string, outcome: 'release' | 'refund', note: string): Promise<void> {
  const { error } = await (await sb()).rpc('resolve_dispute', { p_dispute_id: disputeId, p_outcome: outcome, p_note: note || '' });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Authentication centre (admins). Both RPCs re-check is_admin server-side.
// ---------------------------------------------------------------------------
export type Inspection = RpcReturns<'list_inspections_for_admin'>[number];

export async function loadInspections(): Promise<Inspection[]> {
  const { data, error } = await (await sb()).rpc('list_inspections_for_admin');
  if (error) throw error;
  return data || [];
}

export async function recordInspection(orderId: string, passed: boolean, note: string, outboundTracking: string, outboundCarrier: string | null): Promise<void> {
  const { error } = await (await sb()).rpc('admin_record_inspection', {
    p_order_id: orderId,
    p_passed: passed,
    p_note: note || undefined,
    p_outbound_tracking: outboundTracking || undefined,
    p_outbound_carrier: outboundCarrier || undefined
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Seller payouts (Stripe Connect)
// ---------------------------------------------------------------------------
export async function loadPayoutStatus(): Promise<{ connected: boolean; payouts_enabled: boolean } | null> {
  const { data, error } = await (await sb()).rpc('my_payout_status');
  if (error) throw error;
  return (data || [])[0] || null;
}

export type PayoutLinkResult = { configured: false; message?: string } | { configured: true; url?: string; kind?: 'onboarding' | 'dashboard'; error?: string };

/** Stripe-hosted onboarding (or dashboard) link for the signed-in seller. */
export async function startPayoutOnboarding(): Promise<PayoutLinkResult> {
  const { data, error } = await (await sb()).functions.invoke<PayoutLinkResult>('connect-onboarding', { body: { app: isNative() } });
  if (error) throw error;
  if (!data) throw new Error('empty response');
  return data;
}
