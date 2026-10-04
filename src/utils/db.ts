// Supabase data-access layer: the only module that talks to the database.
// Maps the app's camelCase shapes (types/domain.ts) to/from the snake_case
// rows in types/database.ts. Every function throws on error; callers decide
// whether a failure is user-visible.
import { supabase } from './supabase.ts';
import type { Json, RpcReturns, Tables } from '../types/database.ts';
import type { CustomItem, EventType, Review, ReviewSnapshot } from '../types/domain.ts';

export type Bid = Tables<'bids'>;
export type Ask = Tables<'asks'>;
export type Order = Tables<'orders'>;
export type Dispute = Tables<'disputes'>;
export type Notification = Tables<'notifications'>;
export type ApiKeyRow = Pick<Tables<'api_keys'>, 'id' | 'label' | 'key_prefix' | 'created_at' | 'revoked_at' | 'last_used_at'>;
export type OrderBook = { bids: Bid[]; asks: Ask[] };
export type OrderRef = Pick<Order, 'id' | 'amount' | 'status'>;

// JSON columns are written by this module only, so reading them back as the
// domain type is safe; this is the single place that assertion happens.
function fromJson<T>(value: Json | null | undefined, fallback: T): T {
  return value === null || value === undefined ? fallback : (value as unknown as T);
}
function toJson(value: unknown): Json {
  return value as Json;
}

// ---------------------------------------------------------------------------
// Custom (self-added) vault items
// ---------------------------------------------------------------------------
function rowToCustomItem(r: Tables<'custom_items'>): CustomItem {
  return {
    id: r.id,
    catalogId: r.catalog_id,
    proposed: !!r.proposed,
    proposedClub: r.proposed_club || '',
    proposedSeason: r.proposed_season || '',
    proposedVariant: r.proposed_variant || '',
    version: r.version,
    sizeGroup: r.size_group,
    size: r.size,
    sleeve: r.sleeve,
    flock: fromJson(r.flock, { source: 'Keine' }),
    patches: fromJson(r.patches, []),
    signature: fromJson(r.signature, { signed: false }),
    tagsAttached: !!r.tags_attached,
    condition: fromJson(r.condition, { grade: 0, defects: [] }),
    provenance: r.provenance || '',
    photos: fromJson(r.photos, {}),
    precheck: fromJson(r.precheck, null),
    verification: fromJson(r.verification, { level: 'self', status: 'none', reason: '', reviewId: null }),
    visibility: fromJson(r.visibility, 'private'),
    salePrice: r.sale_price || '',
    valuation: fromJson(r.valuation, null),
    initialValuation: fromJson(r.initial_valuation, null),
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime()
  };
}

function customItemToRow(userId: string, c: CustomItem) {
  return {
    id: c.id,
    user_id: userId,
    catalog_id: c.catalogId,
    proposed: c.proposed,
    proposed_club: c.proposedClub,
    proposed_season: c.proposedSeason,
    proposed_variant: c.proposedVariant,
    version: c.version,
    size_group: c.sizeGroup,
    size: c.size,
    sleeve: c.sleeve,
    flock: toJson(c.flock),
    patches: toJson(c.patches),
    signature: toJson(c.signature),
    tags_attached: c.tagsAttached,
    condition: toJson(c.condition),
    provenance: c.provenance,
    photos: toJson(c.photos),
    precheck: toJson(c.precheck),
    verification: toJson(c.verification),
    visibility: c.visibility,
    sale_price: c.salePrice,
    valuation: toJson(c.valuation),
    initial_valuation: toJson(c.initialValuation),
    updated_at: new Date().toISOString()
  };
}

export async function loadCustomItems(userId: string): Promise<CustomItem[]> {
  const { data, error } = await supabase.from('custom_items').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToCustomItem);
}

export async function upsertCustomItem(userId: string, item: CustomItem): Promise<void> {
  const { error } = await supabase.from('custom_items').upsert(customItemToRow(userId, item));
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Human review queue (expert verification)
// ---------------------------------------------------------------------------
function rowToReview(r: Tables<'review_queue'>): Review {
  return {
    ...fromJson<ReviewSnapshot>(r.snapshot, {}),
    id: r.id,
    customItemId: r.custom_item_id,
    status: r.status as Review['status'],
    reason: r.reason || '',
    submittedAt: new Date(r.submitted_at).getTime(),
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).getTime() : null
  };
}

export async function loadReviewQueue(): Promise<Review[]> {
  const { data, error } = await supabase.from('review_queue').select('*').order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToReview);
}

export async function findReview(id: string): Promise<Review | null> {
  const { data, error } = await supabase.from('review_queue').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToReview(data) : null;
}

export async function enqueueReview(userId: string, customItemId: string | null, snapshot: ReviewSnapshot): Promise<string> {
  const id = 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const { error } = await supabase.from('review_queue').insert({ id, user_id: userId, custom_item_id: customItemId, snapshot: toJson(snapshot), status: 'pending' });
  if (error) throw error;
  return id;
}

export async function markInReview(id: string): Promise<void> {
  const { error } = await supabase.from('review_queue').update({ status: 'in_review' }).eq('id', id).eq('status', 'pending');
  if (error) throw error;
}

// Admin-only RPC: resolves the review AND stamps the owner's custom item
// server-side (owners can't grant themselves expert verification — a DB
// trigger rejects any verification state not backed by a real decision).
export async function resolveReview(id: string, approved: boolean, reason?: string): Promise<void> {
  const args: { p_id: string; p_approved: boolean; p_reason?: string } = { p_id: id, p_approved: approved };
  if (reason) args.p_reason = reason;
  const { error } = await supabase.rpc('resolve_review', args);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------
export async function loadWatchlist(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('watchlist').select('shirt_id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((r) => r.shirt_id);
}

export async function addWatch(userId: string, shirtId: string): Promise<void> {
  const { error } = await supabase.from('watchlist').upsert({ user_id: userId, shirt_id: shirtId });
  if (error) throw error;
}

export async function removeWatch(userId: string, shirtId: string): Promise<void> {
  const { error } = await supabase.from('watchlist').delete().eq('user_id', userId).eq('shirt_id', shirtId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Order book: bids & asks. Matching happens server-side in the insert
// trigger (match_order_book), so an insert may already have filled.
// ---------------------------------------------------------------------------
export async function placeBid(userId: string, shirtId: string, size: string, amount: number, expiresAt?: string | null): Promise<Bid> {
  const { data, error } = await supabase.from('bids').insert({ user_id: userId, shirt_id: shirtId, size, amount, expires_at: expiresAt ?? null }).select().single();
  if (error) throw error;
  return data;
}

export interface AskInput {
  shirtId?: string | null;
  customItemId?: string | null;
  size: string;
  amount: number;
  condition?: string;
  edition?: string;
  playerPrint?: string;
}

export async function placeAsk(userId: string, a: AskInput): Promise<Ask> {
  const { data, error } = await supabase
    .from('asks')
    .insert({
      user_id: userId,
      shirt_id: a.shirtId || null,
      custom_item_id: a.customItemId || null,
      size: a.size,
      amount: a.amount,
      condition: a.condition || null,
      edition: a.edition || null,
      player_print: a.playerPrint || null
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findOrderForAsk(askId: string): Promise<OrderRef | null> {
  const { data, error } = await supabase.from('orders').select('id,amount,status').eq('ask_id', askId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findOrderForBid(bidId: string): Promise<OrderRef | null> {
  const { data, error } = await supabase.from('orders').select('id,amount,status').eq('bid_id', bidId).maybeSingle();
  if (error) throw error;
  return data;
}

// Expired bids are excluded: the matcher ignores them, so showing one as
// "highest bid" would advertise a price nobody can actually sell at.
export async function loadOrderBook(shirtId: string, size: string): Promise<OrderBook> {
  const now = new Date().toISOString();
  const [{ data: bids, error: be }, { data: asks, error: ae }] = await Promise.all([
    supabase
      .from('bids')
      .select('*')
      .eq('shirt_id', shirtId)
      .eq('size', size)
      .eq('status', 'open')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('amount', { ascending: false }),
    supabase.from('asks').select('*').eq('shirt_id', shirtId).eq('size', size).eq('status', 'open').order('amount', { ascending: true })
  ]);
  if (be) throw be;
  if (ae) throw ae;
  return { bids: bids || [], asks: asks || [] };
}

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
// Notifications
// ---------------------------------------------------------------------------
export async function loadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Behaviour events (feed trending + recommendations)
// ---------------------------------------------------------------------------
export async function logEvent(userId: string | null, shirtId: string, type: EventType): Promise<void> {
  const { error } = await supabase.from('events').insert({ user_id: userId, shirt_id: shirtId, type });
  if (error) throw error; // callers swallow — events must never block UI
}

export async function loadRecentEvents(sinceIso: string): Promise<Pick<Tables<'events'>, 'shirt_id' | 'type' | 'created_at'>[]> {
  const { data, error } = await supabase.from('events').select('shirt_id,type,created_at').gte('created_at', sinceIso).limit(5000);
  if (error) throw error;
  return data || [];
}

// Site-wide trending: aggregated server-side across all users (the events
// table's RLS only lets a client read its own rows).
export async function loadTrendingScores(days = 14): Promise<RpcReturns<'trending_scores'>> {
  const { data, error } = await supabase.rpc('trending_scores', { days });
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Licensable price-index API: admin-only key management (RLS + the RPCs
// re-check is_admin server-side).
// ---------------------------------------------------------------------------
export async function loadApiKeys(): Promise<ApiKeyRow[]> {
  const { data, error } = await supabase.from('api_keys').select('id,label,key_prefix,created_at,revoked_at,last_used_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// plaintext_key is only ever available in this one response; only the hash is stored.
export async function createApiKey(label: string): Promise<RpcReturns<'create_api_key'>[number] | null> {
  const { data, error } = await supabase.rpc('create_api_key', { p_label: label });
  if (error) throw error;
  return (data || [])[0] || null;
}

export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_api_key', { p_id: id });
  if (error) throw error;
}
