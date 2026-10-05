// Public seller profiles (by handle) and buyer reviews. Nothing here returns
// an email or account id to the browser except the seller ids it was given.
import { supabase } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';

export type SellerProfile = RpcReturns<'seller_profile'>[number];
export type SellerListing = RpcReturns<'seller_listings'>[number];
export type SellerReview = RpcReturns<'seller_review_list'>[number];
export type SellerCard = RpcReturns<'seller_cards'>[number];

export async function loadSellerProfile(handle: string): Promise<SellerProfile | null> {
  const { data, error } = await supabase.rpc('seller_profile', { p_handle: handle });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function loadSellerListings(handle: string): Promise<SellerListing[]> {
  const { data, error } = await supabase.rpc('seller_listings', { p_handle: handle });
  if (error) throw error;
  return data ?? [];
}

export async function loadSellerReviews(handle: string): Promise<SellerReview[]> {
  const { data, error } = await supabase.rpc('seller_review_list', { p_handle: handle });
  if (error) throw error;
  return data ?? [];
}

export async function loadSellerCards(userIds: string[]): Promise<Record<string, SellerCard>> {
  if (!userIds.length) return {};
  const { data, error } = await supabase.rpc('seller_cards', { p_user_ids: userIds });
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((c) => [c.user_id, c]));
}

export async function reviewSeller(orderId: string, rating: number, comment: string): Promise<void> {
  const { error } = await supabase.rpc('review_seller', comment.trim() ? { p_order_id: orderId, p_rating: rating, p_comment: comment.trim() } : { p_order_id: orderId, p_rating: rating });
  if (error) throw error;
}

/** The review the signed-in buyer left on an order, if any (RLS: own rows only). */
export async function loadMyReview(orderId: string): Promise<{ rating: number; comment: string | null } | null> {
  const { data, error } = await supabase.from('seller_reviews').select('rating, comment').eq('order_id', orderId).maybeSingle();
  if (error) throw error;
  return data;
}
