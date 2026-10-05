// Trending + "recommended for you". Trending blends each shirt's real
// engagement (trending_scores(), across all users) with its catalogue price
// trend, so the list is sensible on day one and real usage takes over as it
// accumulates. Recommendations score unseen shirts by the league/type
// affinity of the user's own recent views, watches, bids and buys, seeded
// by what they said they collect during onboarding.
import { SHIRTS, type Shirt } from '../../data.ts';
import { useSession } from '../../lib/session.tsx';
import { usePersonalEvents, useTrendingScores } from '../market/queries.ts';

const WEIGHT: Record<string, number> = { buy: 8, bid: 5, watch: 3, view: 1, unwatch: 0 };

export function useHomeLists(ownedCatalogIds: string[] = []) {
  const { user, profile } = useSession();
  const scores = useTrendingScores().data ?? {};
  const events = usePersonalEvents(user?.id).data ?? [];

  const maxScore = Math.max(1, ...Object.values(scores));
  const live = (s: Shirt) => s.trend + ((scores[s.id] || 0) / maxScore) * 40;
  const trending = [...SHIRTS].sort((a, b) => live(b) - live(a)).slice(0, 8);

  const seen = new Set<string>(ownedCatalogIds);
  const league: Record<string, number> = {};
  const type: Record<string, number> = {};
  for (const e of events) {
    const s = SHIRTS.find((x) => x.id === e.shirt_id);
    if (!s) continue;
    seen.add(s.id);
    const w = WEIGHT[e.type] ?? 0;
    league[s.league] = (league[s.league] || 0) + w;
    type[s.type] = (type[s.type] || 0) + w;
  }
  // Stated interests count like a few watches each, so they lead on day one
  // and real behaviour takes over as it accumulates.
  for (const l of profile?.interests.leagues ?? []) league[l] = (league[l] || 0) + 6;
  for (const t of profile?.interests.types ?? []) type[t] = (type[t] || 0) + 6;
  const affinity = (s: Shirt) => (league[s.league] || 0) + (type[s.type] || 0);
  const recommended = Object.keys(league).length || Object.keys(type).length
    ? SHIRTS.filter((s) => affinity(s) > 0 && !seen.has(s.id))
        .sort((a, b) => affinity(b) - affinity(a) || b.trend - a.trend)
        .slice(0, 8)
    : [];

  return { trending, recommended };
}
