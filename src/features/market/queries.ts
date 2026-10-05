// Live market data: order book, per-shirt stats, site-wide stats, trending.
import { useQuery } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { useLive } from '../../lib/realtime.ts';

export function useOrderBook(shirtId: string | undefined, size: string | undefined) {
  // Any new/cancelled/matched bid or ask on this shirt refreshes the book and stats live.
  useLive(
    [
      { table: 'bids', filter: 'shirt_id=eq.' + shirtId },
      { table: 'asks', filter: 'shirt_id=eq.' + shirtId }
    ],
    [['orderBook', shirtId], ['shirtStats', shirtId]],
    !!shirtId
  );
  return useQuery({
    queryKey: ['orderBook', shirtId, size],
    enabled: !!shirtId && !!size,
    queryFn: () => db.loadOrderBook(shirtId!, size!),
    placeholderData: { bids: [], asks: [] }
  });
}

export function useShirtStats(shirtId: string | undefined) {
  return useQuery({ queryKey: ['shirtStats', shirtId], enabled: !!shirtId, queryFn: () => db.loadShirtStats(shirtId!) });
}

export function usePublicStats() {
  return useQuery({ queryKey: ['publicStats'], queryFn: db.loadPublicStats, staleTime: 60_000 });
}

/** shirt id → engagement score, aggregated server-side across all users. */
export function useTrendingScores() {
  return useQuery({
    queryKey: ['trending'],
    queryFn: async () => Object.fromEntries((await db.loadTrendingScores()).map((r) => [r.shirt_id, Number(r.score)])) as Record<string, number>,
    staleTime: 60_000
  });
}

/** The signed-in user's own recent events (RLS limits the read to them). */
export function usePersonalEvents(uid: string | undefined) {
  return useQuery({
    queryKey: ['personalEvents', uid],
    enabled: !!uid,
    queryFn: () => db.loadRecentEvents(new Date(Date.now() - 30 * 864e5).toISOString()),
    staleTime: 60_000
  });
}
