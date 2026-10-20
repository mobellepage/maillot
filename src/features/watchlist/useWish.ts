// The wishlist for a shirt seen somewhere (a collector's shirt, a feed
// card): its library kit when known (kit likes), else its catalogue model
// (watchlist). Liking a collector's own shirt is something else (item_likes).
import type { FeedKit } from '../../utils/db.ts';
import { useKitLikes } from './useKitLikes.ts';
import { useWatchlist } from './useWatchlist.ts';

export interface WishTarget {
  catalogId: string | null;
  kitId: string | null;
  kitImage?: string | null;
  club?: string | null;
  season?: string | null;
}

// Enough of the kit for a guest's wishlist; members' wishlists reload the full kit.
const kitOf = (x: WishTarget): FeedKit => ({ id: x.kitId!, club_id: '', club_name: x.club ?? '', league: '', season: x.season ?? '', season_year: 0, kind: 'home', variant: '', image_path: x.kitImage ?? null });

export function useWish() {
  const watch = useWatchlist();
  const kits = useKitLikes();
  const has = (x: WishTarget) => (x.kitId ? kits.has(x.kitId) : !!x.catalogId && watch.has(x.catalogId));
  return {
    can: (x: WishTarget) => !!x.kitId || !!x.catalogId,
    has,
    toggle: (x: WishTarget, quiet = false) => {
      if (x.kitId) kits.toggle(kitOf(x));
      else if (x.catalogId) watch.toggle(x.catalogId, { quiet });
    },
    /** Puts it on the wishlist (or takes it off), only if that changes anything. */
    set: (x: WishTarget, on: boolean) => {
      if (has(x) === on) return;
      if (x.kitId) kits.toggle(kitOf(x));
      else if (x.catalogId) watch.toggle(x.catalogId, { quiet: true });
    }
  };
}
