// Supabase data-access layer. Replaces the old localStorage-only persistence
// (utils/storage.js + utils/reviewQueue.js) for everything that is now
// genuinely multi-user: custom vault items, the human review queue, the
// watchlist, the real order book, orders/escrow, disputes and notifications.
//
// Each section maps the app's existing camelCase JS shapes (unchanged, so
// call sites in engine.js need minimal edits) to/from the snake_case Postgres
// columns created in the "init_maillot_schema" migration.
import { supabase } from './supabase.js';

// ---------------------------------------------------------------------------
// Custom (self-added) vault items
// ---------------------------------------------------------------------------
function rowToCustomItem(r) {
  return {
    id: r.id,
    catalogId: r.catalog_id,
    proposed: r.proposed,
    proposedClub: r.proposed_club || '',
    proposedSeason: r.proposed_season || '',
    proposedVariant: r.proposed_variant || '',
    version: r.version,
    sizeGroup: r.size_group,
    size: r.size,
    sleeve: r.sleeve,
    flock: r.flock || {},
    patches: r.patches || [],
    signature: r.signature || {},
    tagsAttached: r.tags_attached,
    condition: r.condition || {},
    provenance: r.provenance || '',
    photos: r.photos || {},
    precheck: r.precheck,
    verification: r.verification,
    visibility: r.visibility,
    salePrice: r.sale_price || '',
    valuation: r.valuation,
    initialValuation: r.initial_valuation,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime()
  };
}

function customItemToRow(userId, c) {
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
    flock: c.flock,
    patches: c.patches,
    signature: c.signature,
    tags_attached: c.tagsAttached,
    condition: c.condition,
    provenance: c.provenance,
    photos: c.photos,
    precheck: c.precheck,
    verification: c.verification,
    visibility: c.visibility,
    sale_price: c.salePrice,
    valuation: c.valuation,
    initial_valuation: c.initialValuation,
    updated_at: new Date().toISOString()
  };
}

export async function loadCustomItems(userId) {
  const { data, error } = await supabase.from('custom_items').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToCustomItem);
}

export async function upsertCustomItem(userId, item) {
  const { error } = await supabase.from('custom_items').upsert(customItemToRow(userId, item));
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Human review queue (expert verification)
// ---------------------------------------------------------------------------
function rowToReview(r) {
  return {
    ...r.snapshot,
    id: r.id,
    customItemId: r.custom_item_id,
    status: r.status,
    reason: r.reason || '',
    submittedAt: new Date(r.submitted_at).getTime(),
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).getTime() : null
  };
}

export async function loadReviewQueue() {
  const { data, error } = await supabase.from('review_queue').select('*').order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToReview);
}

export async function findReview(id) {
  const { data, error } = await supabase.from('review_queue').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToReview(data) : null;
}

export async function enqueueReview(userId, customItemId, snapshot) {
  const id = 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const { error } = await supabase.from('review_queue').insert({ id, user_id: userId, custom_item_id: customItemId, snapshot, status: 'pending' });
  if (error) throw error;
  return id;
}

export async function markInReview(id) {
  const { error } = await supabase.from('review_queue').update({ status: 'in_review' }).eq('id', id).eq('status', 'pending');
  if (error) throw error;
}

export async function resolveReview(id, approved, reason) {
  const { error } = await supabase
    .from('review_queue')
    .update({ status: approved ? 'approved' : 'rejected', reason: reason || '', reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------
export async function loadWatchlist(userId) {
  const { data, error } = await supabase.from('watchlist').select('shirt_id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((r) => r.shirt_id);
}

export async function addWatch(userId, shirtId) {
  const { error } = await supabase.from('watchlist').upsert({ user_id: userId, shirt_id: shirtId });
  if (error) throw error;
}

export async function removeWatch(userId, shirtId) {
  const { error } = await supabase.from('watchlist').delete().eq('user_id', userId).eq('shirt_id', shirtId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Real order book: bids & asks (matching happens server-side, see the
// match_order_book() trigger function applied in the init migration)
// ---------------------------------------------------------------------------
export async function placeBid(userId, shirtId, size, amount, expiresAt) {
  const { data, error } = await supabase.from('bids').insert({ user_id: userId, shirt_id: shirtId, size, amount, expires_at: expiresAt }).select().single();
  if (error) throw error;
  return data;
}

export async function placeAsk(userId, { shirtId, customItemId, size, amount }) {
  const { data, error } = await supabase.from('asks').insert({ user_id: userId, shirt_id: shirtId || null, custom_item_id: customItemId || null, size, amount }).select().single();
  if (error) throw error;
  return data;
}

export async function loadOrderBook(shirtId, size) {
  const [{ data: bids, error: be }, { data: asks, error: ae }] = await Promise.all([
    supabase.from('bids').select('*').eq('shirt_id', shirtId).eq('size', size).eq('status', 'open').order('amount', { ascending: false }),
    supabase.from('asks').select('*').eq('shirt_id', shirtId).eq('size', size).eq('status', 'open').order('amount', { ascending: true })
  ]);
  if (be) throw be;
  if (ae) throw ae;
  return { bids: bids || [], asks: asks || [] };
}

// ---------------------------------------------------------------------------
// Orders / escrow
// ---------------------------------------------------------------------------
export async function loadMyOrders(userId) {
  const { data, error } = await supabase.from('orders').select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(orderId, status, extra) {
  const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString(), ...(extra || {}) }).eq('id', orderId);
  if (error) throw error;
}

// Starts a Stripe Checkout Session (card + TWINT) for a pending_payment order
// via the "checkout" Edge Function. Returns { configured: false, message } if
// Stripe keys haven't been set on the project yet, or { configured: true, url }
// to redirect the buyer to Stripe-hosted checkout.
export async function createCheckoutSession(orderId) {
  const { data, error } = await supabase.functions.invoke('checkout', { body: { orderId } });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------
export async function openDispute(orderId, userId, reason) {
  const { data, error } = await supabase.from('disputes').insert({ order_id: orderId, opened_by: userId, reason }).select().single();
  if (error) throw error;
  return data;
}

export async function loadDisputesForOrder(orderId) {
  const { data, error } = await supabase.from('disputes').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function loadNotifications(userId) {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Behavior events (feeds the recommendation/trending engine)
// ---------------------------------------------------------------------------
export async function logEvent(userId, shirtId, type) {
  const { error } = await supabase.from('events').insert({ user_id: userId || null, shirt_id: shirtId, type });
  if (error) throw error; // caller should swallow — events must never block UI
}

export async function loadRecentEvents(sinceIso) {
  const { data, error } = await supabase.from('events').select('shirt_id,type,created_at').gte('created_at', sinceIso).limit(5000);
  if (error) throw error;
  return data || [];
}
