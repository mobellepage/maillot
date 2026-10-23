// Public seller and collector profiles (by handle), collector search and
// buyer reviews. Nothing here returns an email or account id to the browser
// except the seller ids it was given.
import { sb } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';

export type SellerProfile = RpcReturns<'seller_profile'>[number];
export type SellerReview = RpcReturns<'seller_review_list'>[number];
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

export async function loadSellerReviews(handle: string): Promise<SellerReview[]> {
  const { data, error } = await (await sb()).rpc('seller_review_list', { p_handle: handle });
  if (error) throw error;
  return data ?? [];
}

/** Members whose handle contains the query (2+ characters) and who show at least one shirt or listing. */
export async function searchCollectors(q: string): Promise<CollectorHit[]> {
  const { data, error } = await (await sb()).rpc('search_collectors', { p_q: q });
  if (error) throw error;
  return data ?? [];
}

/** A collector's shirts that aren't private, newest first (no values, no label photos). */
export type MarketExemplarRow = RpcReturns<'market_exemplars'>[number];

/** Every shirt in a collection that isn't private (from collections that aren't private): the marketplace. */
export async function loadMarketExemplars(): Promise<MarketExemplarRow[]> {
  const { data, error } = await (await sb()).rpc('market_exemplars', { p_limit: 500 });
  if (error) throw error;
  return data ?? [];
}

export type FeedEventRow = RpcReturns<'feed_events'>[number];

/** What happened lately to shirts in collections (added, for sale, open to offers, cheaper, verified). */
export async function loadFeedEvents(): Promise<FeedEventRow[]> {
  const { data, error } = await (await sb()).rpc('feed_events', { p_limit: 200 });
  if (error) throw error;
  return data ?? [];
}

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

export type MyFollow = RpcReturns<'my_follows'>[number];
export type CollectorFollow = RpcReturns<'collector_follows'>[number];
export type FollowingPost = RpcReturns<'following_feed'>[number];
export type FollowingStory = RpcReturns<'following_stories'>[number];

/** Whom a collector follows and who follows them (any profile). */
export async function loadCollectorFollows(handle: string): Promise<CollectorFollow[]> {
  const { data, error } = await (await sb()).rpc('collector_follows', { p_handle: handle });
  if (error) throw error;
  return data ?? [];
}

/** The shirts the collectors I follow added, newest first (before: the last one shown, for the next page). */
export async function loadFollowingFeed(before: string | null, limit = 20): Promise<FollowingPost[]> {
  const { data, error } = await (await sb()).rpc('following_feed', { p_before: before, p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

/** Every collector's public shirts, shuffled and dealt round by round (seed: one visit's order; offset: paging). */
export async function loadCommunityFeed(seed: string, offset: number, limit = 20): Promise<FollowingPost[]> {
  const { data, error } = await (await sb()).rpc('community_feed', { p_seed: seed, p_offset: offset, p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

/** Collectors I follow who added shirts in the last 24 hours, with those shirts. */
export async function loadFollowingStories(): Promise<FollowingStory[]> {
  const { data, error } = await (await sb()).rpc('following_stories');
  if (error) throw error;
  return data ?? [];
}

/** My short bio on my profile (up to 160 characters). */
export async function saveBio(userId: string, bio: string): Promise<void> {
  const { error } = await (await sb()).from('profiles').update({ bio: bio.trim().slice(0, 160) || null }).eq('id', userId);
  if (error) throw error;
}

/** Whom I follow and who follows me, newest first (my own profile). */
export async function loadMyFollows(): Promise<MyFollow[]> {
  const { data, error } = await (await sb()).rpc('my_follows');
  if (error) throw error;
  return data ?? [];
}

/** The most-followed public collections (home page). */
export async function loadTopCollectors(limit = 10): Promise<TopCollector[]> {
  const { data, error } = await (await sb()).rpc('top_collectors', { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

/** One shirt of a collector's peek on the Discover page. */
export interface CollectorPreview {
  id: string;
  catalog_id: string | null;
  thumb_path: string | null;
  kit_image: string | null;
}
export type DiscoverCollector = Omit<RpcReturns<'discover_collectors'>[number], 'preview'> & { preview: CollectorPreview[] };

/** A random handful of other collectors with a peek at their collection. */
export async function loadDiscoverCollectors(limit = 8): Promise<DiscoverCollector[]> {
  const { data, error } = await (await sb()).rpc('discover_collectors', { p_limit: limit });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, preview: (Array.isArray(r.preview) ? r.preview : []) as unknown as CollectorPreview[] }));
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

export type PublicWish = RpcReturns<'public_wishlist'>[number];

/** A collector's wishlist (library kits with the print wanted, and watched catalogue shirts); empty when their collection is private. */
export async function loadPublicWishlist(handle: string): Promise<PublicWish[]> {
  const { data, error } = await (await sb()).rpc('public_wishlist', { p_handle: handle });
  if (error) throw error;
  return data ?? [];
}
