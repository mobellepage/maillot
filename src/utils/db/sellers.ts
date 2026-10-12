// Public seller and collector profiles (by handle), collector search and
// buyer reviews. Nothing here returns an email or account id to the browser
// except the seller ids it was given.
import { sb } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';

export type SellerProfile = RpcReturns<'seller_profile'>[number];
export type SellerListing = RpcReturns<'seller_listings'>[number];
export type SellerReview = RpcReturns<'seller_review_list'>[number];
export type SellerCard = RpcReturns<'seller_cards'>[number];
export type CollectorHit = RpcReturns<'search_collectors'>[number];
export type PublicShirt = RpcReturns<'public_collection'>[number];
export type CollectorStats = RpcReturns<'collector_profile'>[number];
export type Followed = RpcReturns<'my_following'>[number];
export type PublicShirtPhoto = RpcReturns<'public_shirt_photos'>[number];
export type TopCollector = RpcReturns<'top_collectors'>[number];
export type Dealer = RpcReturns<'admin_dealers'>[number];

export async function loadSellerProfile(handle: string): Promise<SellerProfile | null> {
  const { data, error } = await (await sb()).rpc('seller_profile', { p_handle: handle });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function loadSellerListings(handle: string): Promise<SellerListing[]> {
  const { data, error } = await (await sb()).rpc('seller_listings', { p_handle: handle });
  if (error) throw error;
  return data ?? [];
}

export async function loadSellerReviews(handle: string): Promise<SellerReview[]> {
  const { data, error } = await (await sb()).rpc('seller_review_list', { p_handle: handle });
  if (error) throw error;
  return data ?? [];
}

export async function loadSellerCards(userIds: string[]): Promise<Record<string, SellerCard>> {
  if (!userIds.length) return {};
  const { data, error } = await (await sb()).rpc('seller_cards', { p_user_ids: userIds });
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((c) => [c.user_id, c]));
}

/** Members whose handle contains the query (2+ characters) and who show at least one shirt or listing. */
export async function searchCollectors(q: string): Promise<CollectorHit[]> {
  const { data, error } = await (await sb()).rpc('search_collectors', { p_q: q });
  if (error) throw error;
  return data ?? [];
}

/** A collector's shirts that aren't private, newest first (no values, no label photos). */
export async function loadPublicCollection(handle: string): Promise<PublicShirt[]> {
  const { data, error } = await (await sb()).rpc('public_collection', { p_handle: handle });
  if (error) throw error;
  return data ?? [];
}

/** The pictures others may see of one shirt in a member's collection: main photo and back. */
export async function loadPublicShirtPhotos(handle: string, itemId: string): Promise<PublicShirtPhoto[]> {
  const { data, error } = await (await sb()).rpc('public_shirt_photos', { p_handle: handle, p_item_id: itemId });
  if (error) throw error;
  return data ?? [];
}

/** Follow counts, whether the viewer follows (or is) this member, and the value opt-in. */
export async function loadCollectorStats(handle: string): Promise<CollectorStats | null> {
  const { data, error } = await (await sb()).rpc('collector_profile', { p_handle: handle });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function setFollowing(handle: string, follow: boolean): Promise<void> {
  const { error } = await (await sb()).rpc(follow ? 'follow_collector' : 'unfollow_collector', { p_handle: handle });
  if (error) throw error;
}

/** The collectors the signed-in member follows, newest first. */
export async function loadMyFollowing(): Promise<Followed[]> {
  const { data, error } = await (await sb()).rpc('my_following');
  if (error) throw error;
  return data ?? [];
}

/** The most-followed public collections (home page). */
export async function loadTopCollectors(limit = 10): Promise<TopCollector[]> {
  const { data, error } = await (await sb()).rpc('top_collectors', { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

/** Admins: dealers and members on their own commission rate. */
export async function loadDealers(): Promise<Dealer[]> {
  const { data, error } = await (await sb()).rpc('admin_dealers');
  if (error) throw error;
  return data ?? [];
}

/** Admins: verify a dealer (with an optional own commission rate, 0–0.3) or clear it. */
export async function setDealer(handle: string, verified: boolean, rate: number | null): Promise<void> {
  const { error } = await (await sb()).rpc('admin_set_dealer', { p_handle: handle, p_verified: verified, p_commission_rate: rate });
  if (error) throw error;
}

export async function reviewSeller(orderId: string, rating: number, comment: string): Promise<void> {
  const { error } = await (await sb()).rpc('review_seller', comment.trim() ? { p_order_id: orderId, p_rating: rating, p_comment: comment.trim() } : { p_order_id: orderId, p_rating: rating });
  if (error) throw error;
}

/** The review the signed-in buyer left on an order, if any (RLS: own rows only). */
export async function loadMyReview(orderId: string): Promise<{ rating: number; comment: string | null } | null> {
  const { data, error } = await (await sb()).from('seller_reviews').select('rating, comment').eq('order_id', orderId).maybeSingle();
  if (error) throw error;
  return data;
}
