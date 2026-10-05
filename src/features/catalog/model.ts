// Pure catalogue logic: search, filters, sorting, market value by size,
// related shirts and the index ticker. No React, no I/O — unit-tested.
import { BY, CONDS, MULT, pct, SHIRTS, type Shirt } from '../../data.ts';
import type { ShirtCardModel } from '../../ui/ShirtCard.tsx';
import { alpha } from '../../ui/tokens.ts';

export type FilterKey = 'type' | 'league' | 'club' | 'brand' | 'decade' | 'condition';
export type Filters = Record<FilterKey, string[]>;
export type SortKey = 'trending' | 'gain' | 'newest' | 'asc' | 'desc';

export const FILTER_KEYS: FilterKey[] = ['type', 'league', 'club', 'brand', 'decade', 'condition'];
export const EMPTY_FILTERS: Filters = { type: [], league: [], club: [], brand: [], decade: [], condition: [] };
export const PRICE_MAX = 600;

const FIELD: Record<FilterKey, keyof Shirt> = { type: 'type', league: 'league', club: 'club', brand: 'brand', decade: 'decade', condition: 'cond' };

export const SORTS: { value: SortKey; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'gain', label: 'Biggest gainers' },
  { value: 'newest', label: 'Newest' },
  { value: 'asc', label: 'Price low → high' },
  { value: 'desc', label: 'Price high → low' }
];

const SORT_FN: Record<SortKey, (a: Shirt, b: Shirt) => number> = {
  trending: (a, b) => b.trend - a.trend,
  newest: (a, b) => a.added - b.added,
  asc: (a, b) => a.price - b.price,
  desc: (a, b) => b.price - a.price,
  gain: (a, b) => b.ch - a.ch
};

export function getShirt(id: string | undefined): Shirt | undefined {
  return id ? BY[id] : undefined;
}

function words(q: string): string[] {
  return q.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every word must appear somewhere in the shirt's search haystack. */
export function search(q: string, list: Shirt[] = SHIRTS): Shirt[] {
  const ws = words(q);
  return ws.length ? list.filter((s) => ws.every((w) => s.hay.includes(w))) : list;
}

export interface BrowseQuery {
  q: string;
  filters: Filters;
  min: number;
  max: number;
  sort: SortKey;
}

export function browse({ q, filters, min, max, sort }: BrowseQuery): Shirt[] {
  return search(q)
    .filter((s) => FILTER_KEYS.every((k) => !filters[k].length || filters[k].includes(String(s[FIELD[k]]))))
    .filter((s) => s.price >= min && (max >= PRICE_MAX || s.price <= max))
    .sort(SORT_FN[sort]);
}

export interface FilterGroup {
  key: FilterKey;
  title: string;
  options: { value: string; count: number }[];
}

export function filterGroups(): FilterGroup[] {
  const opts = (k: FilterKey, values: string[]) => values.map((value) => ({ value, count: SHIRTS.filter((s) => String(s[FIELD[k]]) === value).length }));
  const uniq = (k: FilterKey) => [...new Set(SHIRTS.map((s) => String(s[FIELD[k]])))];
  return [
    { key: 'type', title: 'Category', options: opts('type', ['New', 'Retro', 'Match-worn']) },
    { key: 'league', title: 'League', options: opts('league', uniq('league')) },
    { key: 'club', title: 'Club', options: opts('club', uniq('club').sort()) },
    { key: 'brand', title: 'Brand', options: opts('brand', uniq('brand').sort()) },
    { key: 'decade', title: 'Era', options: opts('decade', uniq('decade').sort().reverse()) },
    { key: 'condition', title: 'Condition', options: opts('condition', CONDS.filter((c) => SHIRTS.some((s) => s.cond === c))) }
  ];
}

/** Catalogue market value for a size (index estimate, not a listing). */
export function marketValue(s: Shirt, size: string): number {
  return Math.round(s.price * (s.type === 'Match-worn' ? 1 : MULT[size] ?? 1));
}

/** The size to show: the requested one if the shirt comes in it, else M, else its only size. */
export function resolveSize(s: Shirt, wanted: string | null | undefined): string {
  if (wanted && s.sizes.includes(wanted)) return wanted;
  return s.sizes.includes('M') ? 'M' : s.sizes[0] ?? 'M';
}

export function related(s: Shirt, n = 4): Shirt[] {
  return SHIRTS.filter((x) => x.id !== s.id && (x.league === s.league || x.type === s.type))
    .sort((a, b) => b.trend - a.trend)
    .slice(0, n);
}

export function tagFor(s: Shirt): string {
  return s.type === 'New' ? 'New season' : s.type;
}

export function toCard(s: Shirt, money: (chf: number) => string): ShirtCardModel {
  return {
    id: s.id,
    name: s.name,
    brand: s.brand,
    season: s.season,
    tag: tagFor(s),
    look: { pat: s.pat, trim: s.trim, crest: s.crest, num: s.num },
    glow: alpha(s.glow, 0.34),
    priceFmt: money(s.price),
    chFmt: pct(s.ch),
    up: s.ch >= 0
  };
}

export interface IndexSegment {
  label: string;
  value: number;
  change: number;
}

/** Market index ticker, computed from the catalogue (never typed in by hand). */
export function indexSegments(): IndexSegment[] {
  const seg = (label: string, pred: (s: Shirt) => boolean): IndexSegment | null => {
    const xs = SHIRTS.filter(pred);
    if (!xs.length) return null;
    return { label, value: Math.round(xs.reduce((a, x) => a + x.price, 0) / xs.length), change: xs.reduce((a, x) => a + x.ch, 0) / xs.length };
  };
  return [
    seg('All shirts', () => true),
    seg('Retro', (x) => x.type === 'Retro'),
    seg('Match-worn', (x) => x.type === 'Match-worn'),
    seg('World Cup ’26', (x) => x.league === 'National Teams' && x.year === 2026),
    seg('Swiss SL', (x) => x.league === 'Swiss Super League'),
    seg('Premier League', (x) => x.league === 'Premier League'),
    seg('Serie A', (x) => x.league === 'Serie A')
  ].filter((x): x is IndexSegment => !!x);
}

export const trendingByMarket = (n = 8): Shirt[] => [...SHIRTS].sort((a, b) => b.trend - a.trend).slice(0, n);
export const newest = (n = 8): Shirt[] => [...SHIRTS].sort((a, b) => a.added - b.added).slice(0, n);
export function movers(dir: 'up' | 'down', n = 6): Shirt[] {
  const sorted = [...SHIRTS].sort((a, b) => b.ch - a.ch);
  return dir === 'up' ? sorted.slice(0, n) : sorted.slice(-n).reverse();
}
