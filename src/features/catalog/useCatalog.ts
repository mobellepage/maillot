// Loads the catalogue from Postgres (plus real-trade prices) and swaps it in
// for the bundled snapshot. Pages call useCatalog() to re-render when it lands.
import { useEffect, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildShirt, BY, getCatalogVersion, replaceCatalog, SHIRTS, subscribeCatalog, type ShirtType, type Trades } from '../../data.ts';
import { loadCatalog, loadCatalogMarket, type CatalogMarketRow, type CatalogRow } from '../../utils/db.ts';

const DAY = 864e5;

export function toShirt(r: CatalogRow, m?: CatalogMarketRow) {
  const trades: Trades = m
    ? { count: Number(m.completed_sales), lastPrice: m.last_price === null ? null : Number(m.last_price), lastSoldAt: m.last_sold_at, avgRecent: m.avg_recent === null ? null : Number(m.avg_recent) }
    : { count: 0, lastPrice: null, lastSoldAt: null, avgRecent: null };
  return buildShirt(
    {
      id: r.id,
      club: r.club,
      name: r.name,
      season: r.season,
      year: r.year,
      brand: r.brand,
      league: r.league,
      type: r.type as ShirtType,
      cond: r.cond,
      edition: r.edition,
      ...(r.player ? { player: r.player } : {}),
      price: Number(r.index_price),
      ch: Number(r.index_change_30d),
      pat: r.pattern,
      trim: r.trim_color,
      ...(r.number_color ? { num: r.number_color } : {}),
      crest: r.crest_color,
      glow: r.glow_color,
      added: Math.max(0, Math.round((Date.now() - new Date(r.added_at).getTime()) / DAY)),
      sizes: r.sizes,
      sku: r.sku
    },
    trades
  );
}

/** Mounted once at the root: keeps the live catalogue in sync with the database. */
export function useCatalogSync() {
  const q = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const [rows, market] = await Promise.all([loadCatalog(), loadCatalogMarket().catch(() => [])]);
      const byId = new Map(market.map((m) => [m.shirt_id, m]));
      return rows.map((r) => toShirt(r, byId.get(r.id)));
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });
  useEffect(() => {
    if (q.data && q.data.length) replaceCatalog(q.data);
  }, [q.data]);
}

/** Subscribe a component to catalogue updates; returns the live list and map. */
export function useCatalog() {
  useSyncExternalStore(subscribeCatalog, getCatalogVersion, getCatalogVersion);
  return { shirts: SHIRTS, by: BY };
}
