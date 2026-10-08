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
