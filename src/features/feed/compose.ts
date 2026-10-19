// What the feed shows, in which order. Pure, so it is unit-tested.
//  - News from collections comes first: a shirt added, put up for sale,
//    opened to offers, made cheaper or verified (already ordered, wishlist
//    matches first: exemplars/model.ts orderEvents).
//  - What the member liked tilts the odds: same club strongly, same league
//    and same kind of shirt (retro, new, match-worn) a little. Leagues and
//    kinds picked at sign-up count the same way, so a new member's very
//    first cards already fit their taste.
//  - Things already seen sink towards the end.
//  - Kits of the library fill in (one after every three news items) —
//    favourite team first in line, then liked clubs and leagues — or, when
//    the library can't be reached, catalogue shirts; so the feed is never empty.
import type { FeedKit } from '../../utils/db/kitLikes.ts';
import type { FeedEvent } from '../market/exemplars/model.ts';

export interface CatalogEntry {
  id: string;
  club: string;
  league: string;
  type: string;
}

export type FeedItem =
  | { kind: 'catalog'; key: string; shirtId: string }
  | { kind: 'kit'; key: string; kit: FeedKit }
  | { kind: 'exemplar'; key: string; event: FeedEvent };

export const keyOf = (item: Pick<FeedItem, 'key'>) => item.key;

interface Input {
  catalog: CatalogEntry[];
  /** Shirt ids on the member's watchlist (likes). */
  liked: string[];
  /** Feed item keys seen before. */
  seen: ReadonlySet<string>;
  /** Leagues and kinds of shirt chosen during onboarding, and the favourite team. */
  interests?: { leagues?: string[]; types?: string[]; club?: string } | undefined;
  /** Library kits to swipe through instead of catalogue shirts. */
  kits?: FeedKit[];
  /** Library kits liked before. */
  likedKits?: FeedKit[];
  /** News from collections, in the order to show (wishlist matches first). */
  events?: FeedEvent[];
  rand?: () => number;
}

export function composeFeed({ catalog, liked, seen, interests, kits = [], likedKits = [], events = [], rand = Math.random }: Input): FeedItem[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const likedEntries = liked.map((id) => byId.get(id)).filter((c): c is CatalogEntry => !!c);
  const clubs = new Set(likedEntries.map((c) => c.club));
  const leagues = new Set([...likedEntries.map((c) => c.league), ...(interests?.leagues ?? [])]);
  const types = new Set([...likedEntries.map((c) => c.type), ...(interests?.types ?? [])]);
  const kitClubs = new Set(likedKits.map((k) => k.club_id));
  for (const k of likedKits) leagues.add(k.league);

  const weight = (shirtId: string, key: string) => {
    const c = byId.get(shirtId);
    let w = 1;
    if (c && clubs.has(c.club)) w += 2;
    if (c && leagues.has(c.league)) w += 1;
    if (c && types.has(c.type)) w += 0.5;
    return seen.has(key) ? w * 0.25 : w;
  };
  // Weighted random order: smaller sort key first (exponential races).
  const race = <T,>(xs: T[], w: (x: T) => number) =>
    xs
      .map((x) => ({ x, k: -Math.log(1 - rand()) / w(x) }))
      .sort((a, b) => a.k - b.k)
      .map((r) => r.x);

  const listed: FeedItem[] = events.map((event): FeedItem => ({ kind: 'exemplar', key: event.key, event }));

  // Library kits when given, else catalogue shirts.
  const kitWeight = (k: FeedKit, key: string) => {
    let w = 1;
    if (k.club_id === interests?.club) w += 3;
    if (kitClubs.has(k.club_id)) w += 2;
    if (leagues.has(k.league)) w += 1;
    return seen.has(key) ? w * 0.25 : w;
  };
  const fillers: FeedItem[] = kits.length
    ? race(
        kits.map((k): FeedItem => ({ kind: 'kit', key: 'k:' + k.id, kit: k })),
        (i) => (i.kind === 'kit' ? kitWeight(i.kit, i.key) : 1)
      )
    : race(
        catalog.map((c): FeedItem => ({ kind: 'catalog', key: 'c:' + c.id, shirtId: c.id })),
        (i) => (i.kind === 'catalog' ? weight(i.shirtId, i.key) : 1)
      );

  const out: FeedItem[] = [];
  let f = 0;
  listed.forEach((it, i) => {
    out.push(it);
    if (i % 3 === 2 && f < fillers.length) out.push(fillers[f++]!);
  });
  return out.concat(fillers.slice(f));
}
