// The scroll-and-like feed: a random batch of live listings with their photos
// and sellers (feed_listings); ordering happens in features/feed/compose.ts.
import { sb } from '../supabase.ts';
import type { FeedListing } from '../../features/feed/compose.ts';
import type { ListingPhoto } from '../../types/domain.ts';

export async function loadFeedListings(limit = 150): Promise<FeedListing[]> {
  const { data, error } = await (await sb()).rpc('feed_listings', { p_limit: limit });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    askId: r.ask_id,
    shirtId: r.shirt_id,
    size: r.size,
    amount: Number(r.amount),
    condition: r.condition,
    edition: r.edition,
    player: r.player_print,
    photos: Array.isArray(r.photos) ? (r.photos as unknown as ListingPhoto[]) : [],
    handle: r.handle,
    dealer: r.dealer
  }));
}
