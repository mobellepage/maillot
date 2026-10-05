// Orders, escrow transitions, checkout and disputes.
import { supabase } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';
import type { Dispute, Order } from './types.ts';

// ---------------------------------------------------------------------------
// Orders / escrow. Clients cannot write `orders` directly (no RLS
// insert/update policy); every transition is a SECURITY DEFINER RPC that
// checks the caller's role (buyer/seller) and the current status.
// ---------------------------------------------------------------------------
export async function loadMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markOrderShipped(orderId: string, tracking?: string | null): Promise<void> {
  const args: { p_order_id: string; p_tracking?: string } = { p_order_id: orderId };
  if (tracking) args.p_tracking = tracking;
  const { error } = await supabase.rpc('order_mark_shipped', args);
  if (error) throw error;
}

export async function confirmOrderReceipt(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('order_confirm_receipt', { p_order_id: orderId });
  if (error) throw error;
}

export async function cancelOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('order_cancel', { p_order_id: orderId });
  if (error) throw error;
}

export type CheckoutResult = { configured: false; message?: string } | { configured: true; url?: string; error?: string };

// Starts (or resumes) a Stripe Checkout Session via the "checkout" edge
// function. { configured: false } means payments aren't switched on yet.
export async function createCheckoutSession(orderId: string): Promise<CheckoutResult> {
  const { data, error } = await supabase.functions.invoke<CheckoutResult>('checkout', { body: { orderId } });
  if (error) throw error;
  if (!data) throw new Error('empty checkout response');
  return data;
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------
// Atomically flips the order to 'disputed' and records who opened it.
export async function openDispute(orderId: string, reason: string): Promise<string> {
  const { data, error } = await supabase.rpc('order_open_dispute', { p_order_id: orderId, p_reason: reason });
  if (error) throw error;
  return data;
}

export async function loadDisputesForOrder(orderId: string): Promise<Dispute[]> {
  const { data, error } = await supabase.from('disputes').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export type AdminDispute = RpcReturns<'list_disputes_for_admin'>[number];

// Admin resolution queue — both RPCs are SECURITY DEFINER and re-check
// is_admin server-side.
export async function loadDisputesForAdmin(): Promise<AdminDispute[]> {
  const { data, error } = await supabase.rpc('list_disputes_for_admin');
  if (error) throw error;
  return data || [];
}

export async function resolveDispute(disputeId: string, outcome: 'release' | 'refund', note: string): Promise<void> {
  const { error } = await supabase.rpc('resolve_dispute', { p_dispute_id: disputeId, p_outcome: outcome, p_note: note || '' });
  if (error) throw error;
}


// ---------------------------------------------------------------------------
// Seller payouts (Stripe Connect)
// ---------------------------------------------------------------------------
export async function loadPayoutStatus(): Promise<{ connected: boolean; payouts_enabled: boolean } | null> {
  const { data, error } = await supabase.rpc('my_payout_status');
  if (error) throw error;
  return (data || [])[0] || null;
}

export type PayoutLinkResult = { configured: false; message?: string } | { configured: true; url?: string; kind?: 'onboarding' | 'dashboard'; error?: string };

/** Stripe-hosted onboarding (or dashboard) link for the signed-in seller. */
export async function startPayoutOnboarding(): Promise<PayoutLinkResult> {
  const { data, error } = await supabase.functions.invoke<PayoutLinkResult>('connect-onboarding', { body: {} });
  if (error) throw error;
  if (!data) throw new Error('empty response');
  return data;
}
