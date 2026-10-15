// Library kits in the feed, and the likes on them (a wishlist of kits next
// to the watchlist of catalogue shirts).
import { sb } from '../supabase.ts';

export interface FeedKit {
  id: string;
  club_id: string;
  club_name: string;
  league: string;
  season: string;
  season_year: number;
  kind: string;
  variant: string;
  image_path: string | null;
}

/** A random mix of library kits, leaning towards these clubs and leagues. */
export async function loadFeedKits(clubs: string[], leagues: string[]): Promise<FeedKit[]> {
  const { data, error } = await (await sb()).rpc('feed_kits', { p_clubs: clubs, p_leagues: leagues });
  if (error) throw error;
  return data || [];
}

export async function loadLikedKits(): Promise<FeedKit[]> {
  const { data, error } = await (await sb()).rpc('my_liked_kits');
  if (error) throw error;
  return data || [];
}

export async function likeKit(kitId: string): Promise<void> {
  const { error } = await (await sb()).from('kit_likes').upsert({ kit_id: kitId }, { onConflict: 'user_id,kit_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function unlikeKit(kitId: string): Promise<void> {
  const { error } = await (await sb()).from('kit_likes').delete().eq('kit_id', kitId);
  if (error) throw error;
}
