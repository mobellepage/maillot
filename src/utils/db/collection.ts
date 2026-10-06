// Custom vault items, the expert review queue and the watchlist.
import { sb } from '../supabase.ts';
import type { Tables } from '../../types/database.ts';
import type { CustomItem, Review, ReviewSnapshot } from '../../types/domain.ts';
import { fromJson, toJson } from './json.ts';
import { persistablePhotos, removePhotos } from './photos.ts';

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
    photos: toJson(persistablePhotos(c.photos)),
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
  const { data, error } = await (await sb()).from('custom_items').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToCustomItem);
}

export async function upsertCustomItem(userId: string, item: CustomItem): Promise<void> {
  const { error } = await (await sb()).from('custom_items').upsert(customItemToRow(userId, item));
  if (error) throw error;
}

/**
 * Removes an item and its photos. Fails with code 23503 while a listing or
 * order still refers to it — those are records the other party relies on.
 */
export async function deleteCustomItem(item: CustomItem): Promise<void> {
  const { error } = await (await sb()).from('custom_items').delete().eq('id', item.id);
  if (error) throw error;
  const paths = Object.values(item.photos).flatMap((p) => [p.path, p.thumbPath].filter((x): x is string => !!x));
  await removePhotos(paths).catch(() => {}); // orphaned files are harmless; the row is gone
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
  const { data, error } = await (await sb()).from('review_queue').select('*').order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToReview);
}

export async function findReview(id: string): Promise<Review | null> {
  const { data, error } = await (await sb()).from('review_queue').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToReview(data) : null;
}

export async function enqueueReview(userId: string, customItemId: string | null, snapshot: ReviewSnapshot): Promise<string> {
  const id = 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const { error } = await (await sb()).from('review_queue').insert({ id, user_id: userId, custom_item_id: customItemId, snapshot: toJson({ ...snapshot, photos: snapshot.photos ? persistablePhotos(snapshot.photos) : undefined }), status: 'pending' });
  if (error) throw error;
  return id;
}

export async function markInReview(id: string): Promise<void> {
  const { error } = await (await sb()).from('review_queue').update({ status: 'in_review' }).eq('id', id).eq('status', 'pending');
  if (error) throw error;
}

// Admin-only RPC: resolves the review AND stamps the owner's custom item
// server-side (owners can't grant themselves expert verification — a DB
// trigger rejects any verification state not backed by a real decision).
export async function resolveReview(id: string, approved: boolean, reason?: string): Promise<void> {
  const args: { p_id: string; p_approved: boolean; p_reason?: string } = { p_id: id, p_approved: approved };
  if (reason) args.p_reason = reason;
  const { error } = await (await sb()).rpc('resolve_review', args);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------
export async function loadWatchlist(userId: string): Promise<string[]> {
  const { data, error } = await (await sb()).from('watchlist').select('shirt_id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((r) => r.shirt_id);
}

export async function addWatch(userId: string, shirtId: string): Promise<void> {
  const { error } = await (await sb()).from('watchlist').upsert({ user_id: userId, shirt_id: shirtId });
  if (error) throw error;
}

export async function removeWatch(userId: string, shirtId: string): Promise<void> {
  const { error } = await (await sb()).from('watchlist').delete().eq('user_id', userId).eq('shirt_id', shirtId);
  if (error) throw error;
}

