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
  /** On the wishlist: the print wanted on it (player and number), if any. */
  print_name?: string | null;
  print_number?: string | null;
  /** On the wishlist: this entry (a kit can be there more than once, with different prints). */
  entry_id?: string | null;
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

export interface WishPrint {
  name: string | null;
  number: string | null;
}

/** Puts a kit on the wishlist (heart, right swipe) unless it's there already. */
export async function likeKit(kitId: string): Promise<void> {
  const { error } = await (await sb()).rpc('wish_kit_like', { p_kit: kitId });
  if (error) throw error;
}

/**
 * Saves the print wanted: on one entry, or (without an entry) as a new entry
 * of the kit — the same kit can be on the wishlist with several prints.
 * Returns the entry, or null when that exact print is there already.
 */
export async function saveKitWish(kitId: string, entryId: string | null, print: WishPrint): Promise<string | null> {
  const { data, error } = await (await sb()).rpc('wish_kit_save', { p_kit: kitId, p_entry: entryId, p_name: print.name ?? '', p_number: print.number ?? '' });
  if (error) throw error;
  return data ?? null;
}

/** Takes one entry off the wishlist. */
export async function removeKitWish(entryId: string): Promise<void> {
  const { error } = await (await sb()).from('kit_likes').delete().eq('id', entryId);
  if (error) throw error;
}

/** Takes the kit off the wishlist, every print of it. */
export async function unlikeKit(kitId: string): Promise<void> {
  const { error } = await (await sb()).from('kit_likes').delete().eq('kit_id', kitId);
  if (error) throw error;
}
