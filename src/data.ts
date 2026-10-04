// Core data + helpers for Maillot, ported from the original prototype.
import { rng, generateSyntheticMarketData, type MarketData } from './marketData.ts';

export type ShirtType = 'New' | 'Retro' | 'Match-worn';

/** A catalogue entry as authored below. */
export interface RawShirt {
  id: string;
  club: string;
  name: string;
  season: string;
  year: number;
  brand: string;
  league: string;
  type: ShirtType;
  cond: string;
  edition: string;
  player?: string;
  price: number;
  /** 30-day price change in % */
  ch: number;
  pat: string;
  trim: string;
  num?: string;
  crest: string;
  glow: string;
  /** days since it was added to the catalogue */
  added: number;
}

/** A catalogue entry plus its (synthetic) market data and derived fields. */
export interface Shirt extends RawShirt, MarketData {
  pName: string;
  pNum: string;
  spark: string;
  /** lower-cased search haystack */
  hay: string;
  sku: string;
  trend: number;
}

export const ACC = '#4BFF8B';
export const NEG = '#FF6B5E';
export const TODAY = new Date(2026, 9, 1).getTime();

const RAW: RawShirt[] = [
  { id: 'ger-26', club: 'Germany', name: 'Germany 2026 Home "The Last Adidas"', season: '2026', year: 2026, brand: 'adidas', league: 'National Teams', type: 'New', cond: 'New with tags', edition: 'Authentic', player: 'Wirtz 17', price: 140, ch: 31, pat: 'linear-gradient(180deg,#F4F4F1 0 31%,#151515 31% 35%,#DD0000 35% 39%,#FFCE00 39% 43%,#F4F4F1 43%)', trim: '#151515', crest: '#151515', glow: '#FFCE00', added: 9 },
  { id: 'sui-26', club: 'Switzerland', name: 'Switzerland 2026 Home', season: '2026', year: 2026, brand: 'Puma', league: 'National Teams', type: 'New', cond: 'New with tags', edition: 'Authentic', player: 'Xhaka 10', price: 95, ch: 12, pat: 'linear-gradient(180deg,#E3262E,#B51B22)', trim: '#FFFFFF', crest: '#FFFFFF', glow: '#E3262E', added: 3 },
  { id: 'acm-0607', club: 'AC Milan', name: 'AC Milan 2006/07 Home — Match-worn', season: '2006/07', year: 2006, brand: 'adidas', league: 'Serie A', type: 'Match-worn', cond: 'Match-worn', edition: 'Player issue', player: 'Kaká 22', price: 450, ch: 6, pat: 'repeating-linear-gradient(90deg,#C8102E 0 11%,#141414 11% 22%)', trim: '#FFFFFF', crest: '#FFFFFF', glow: '#C8102E', added: 60 },
  { id: 'mia-26', club: 'Inter Miami CF', name: 'Inter Miami 2026 Home', season: '2026', year: 2026, brand: 'adidas', league: 'MLS', type: 'New', cond: 'New with tags', edition: 'Authentic', player: 'Messi 10', price: 120, ch: 22, pat: 'linear-gradient(180deg,#F7B5CD,#EC9DBB)', trim: '#231F20', crest: '#231F20', glow: '#F7B5CD', added: 15 },
  { id: 'ars-91', club: 'Arsenal', name: 'Arsenal 1991–93 Away "Bruised Banana"', season: '1991–93', year: 1991, brand: 'adidas', league: 'Premier League', type: 'Retro', cond: 'Excellent', edition: 'Replica', player: '', price: 220, ch: 9, pat: 'repeating-linear-gradient(135deg,#F2D21B 0 9px,#F2D21B 9px 15px,#1C1B3A 15px 18px,#C8102E 18px 21px)', trim: '#1C1B3A', crest: '#C8102E', glow: '#F2D21B', added: 140 },
  { id: 'fcb-2627', club: 'FC Barcelona', name: 'FC Barcelona 2026/27 Home', season: '2026/27', year: 2026, brand: 'Nike', league: 'La Liga', type: 'New', cond: 'New with tags', edition: 'Replica', player: 'Yamal 10', price: 110, ch: 4, pat: 'repeating-linear-gradient(90deg,#A50044 0 12.5%,#004D98 12.5% 25%)', trim: '#EDBB00', crest: '#EDBB00', glow: '#2A63C7', added: 6 },
  { id: 'nap-8788', club: 'SSC Napoli', name: 'SSC Napoli 1987/88 Home', season: '1987/88', year: 1987, brand: 'Ennerre', league: 'Serie A', type: 'Retro', cond: 'Very good', edition: 'Replica', player: 'Maradona 10', price: 380, ch: 14, pat: 'linear-gradient(180deg,#2BA6E0,#1680C2)', trim: '#FFFFFF', crest: '#FFFFFF', glow: '#2BA6E0', added: 30 },
  { id: 'ned-88', club: 'Netherlands', name: 'Netherlands 1988 Home', season: '1988', year: 1988, brand: 'adidas', league: 'National Teams', type: 'Retro', cond: 'Excellent', edition: 'Replica', player: 'van Basten 12', price: 310, ch: 18, pat: 'repeating-linear-gradient(45deg,#FF6A13 0 10px,#EE5A08 10px 20px),#FF6A13', trim: '#FFFFFF', crest: '#FFFFFF', glow: '#FF6A13', added: 45 },
  { id: 'yb-2526', club: 'BSC Young Boys', name: 'BSC Young Boys 2025/26 Home', season: '2025/26', year: 2025, brand: 'Nike', league: 'Swiss Super League', type: 'New', cond: 'New with tags', edition: 'Replica', player: '', price: 89, ch: 1.8, pat: 'linear-gradient(180deg,#151515 0 17%,#FFD200 17%)', trim: '#151515', crest: '#151515', glow: '#FFD200', added: 12 },
  { id: 'juv-9697', club: 'Juventus', name: 'Juventus 1996/97 Home', season: '1996/97', year: 1996, brand: 'Kappa', league: 'Serie A', type: 'Retro', cond: 'Very good', edition: 'Replica', player: 'Del Piero 10', price: 240, ch: 11, pat: 'repeating-linear-gradient(90deg,#141414 0 10%,#F5F5F2 10% 20%)', trim: '#141414', crest: '#C9A227', glow: '#FFFFFF', added: 80 },
  { id: 'ajx-95', club: 'Ajax', name: 'Ajax 1994/95 Home', season: '1994/95', year: 1994, brand: 'Umbro', league: 'Eredivisie', type: 'Retro', cond: 'Excellent', edition: 'Replica', player: 'Kluivert 15', price: 260, ch: 7, pat: 'linear-gradient(90deg,#F5F5F2 0 35%,#D2122E 35% 65%,#F5F5F2 65%)', trim: '#D2122E', num: '#141414', crest: '#D2122E', glow: '#D2122E', added: 95 },
  { id: 'liv-2526', club: 'Liverpool FC', name: 'Liverpool 2025/26 Home', season: '2025/26', year: 2025, brand: 'adidas', league: 'Premier League', type: 'New', cond: 'New with tags', edition: 'Replica', player: 'Salah 11', price: 105, ch: -3, pat: 'linear-gradient(180deg,#D0132F,#A30D25)', trim: '#FFFFFF', crest: '#F6EB61', glow: '#C8102E', added: 40 },
  { id: 'rma-2627', club: 'Real Madrid', name: 'Real Madrid 2026/27 Home', season: '2026/27', year: 2026, brand: 'adidas', league: 'La Liga', type: 'New', cond: 'New with tags', edition: 'Authentic', player: 'Mbappé 10', price: 115, ch: 2, pat: 'linear-gradient(180deg,#F8F7F3,#E2E0D8)', trim: '#C9A227', crest: '#C9A227', glow: '#C9A227', added: 4 },
  { id: 'mun-0708', club: 'Manchester United', name: 'Manchester United 2007/08 Home', season: '2007/08', year: 2007, brand: 'Nike', league: 'Premier League', type: 'Retro', cond: 'Excellent', edition: 'Replica', player: 'Ronaldo 7', price: 180, ch: -2, pat: 'linear-gradient(180deg,#DA1F26,#B3161C)', trim: '#FFFFFF', crest: '#FFD23F', glow: '#DA1F26', added: 120 },
  { id: 'bay-2627', club: 'FC Bayern München', name: 'FC Bayern 2026/27 Home', season: '2026/27', year: 2026, brand: 'adidas', league: 'Bundesliga', type: 'New', cond: 'New with tags', edition: 'Replica', player: 'Kane 9', price: 105, ch: -5, pat: 'linear-gradient(180deg,#DC052D 0 68%,#FFFFFF 68% 71%,#DC052D 71%)', trim: '#FFFFFF', crest: '#0066B2', glow: '#DC052D', added: 2 },
  { id: 'bra-70', club: 'Brazil', name: 'Brazil 1970 Home', season: '1970', year: 1970, brand: 'Athleta', league: 'National Teams', type: 'Retro', cond: 'Good', edition: 'Replica', player: 'Pelé 10', price: 520, ch: 3, pat: 'linear-gradient(180deg,#FEDD00,#F0C800)', trim: '#009B3A', crest: '#009B3A', glow: '#FEDD00', added: 200 },
  { id: 'boc-81', club: 'Boca Juniors', name: 'Boca Juniors 1981 Home', season: '1981', year: 1981, brand: 'adidas', league: 'Liga Profesional', type: 'Retro', cond: 'Good', edition: 'Replica', player: 'Maradona 10', price: 290, ch: 5, pat: 'linear-gradient(180deg,#0B2D6B 0 38%,#F3B229 38% 55%,#0B2D6B 55%)', trim: '#F3B229', num: '#FFFFFF', crest: '#F3B229', glow: '#3D6FD6', added: 70 },
  { id: 'fra-98', club: 'France', name: 'France 1998 Home', season: '1998', year: 1998, brand: 'adidas', league: 'National Teams', type: 'Retro', cond: 'Excellent', edition: 'Replica', player: 'Zidane 10', price: 275, ch: 8, pat: 'linear-gradient(180deg,#14246B 0 30%,#FFFFFF 30% 33%,#E1001A 33% 38%,#FFFFFF 38% 41%,#14246B 41%)', trim: '#FFFFFF', crest: '#FFFFFF', glow: '#3556D8', added: 150 },
  { id: 'psg-2526', club: 'Paris Saint-Germain', name: 'PSG 2025/26 Home', season: '2025/26', year: 2025, brand: 'Nike', league: 'Ligue 1', type: 'New', cond: 'New with tags', edition: 'Replica', player: 'Dembélé 10', price: 115, ch: -4, pat: 'linear-gradient(90deg,#0E1E3F 0 37%,#FFFFFF 37% 39%,#D4202A 39% 61%,#FFFFFF 61% 63%,#0E1E3F 63%)', trim: '#FFFFFF', crest: '#D4202A', glow: '#D4202A', added: 25 },
  { id: 'bas-2526', club: 'FC Basel 1893', name: 'FC Basel 2025/26 Home', season: '2025/26', year: 2025, brand: 'Macron', league: 'Swiss Super League', type: 'New', cond: 'New with tags', edition: 'Replica', player: 'Shaqiri 10', price: 85, ch: -1, pat: 'linear-gradient(90deg,#D6001C 0 50%,#003E80 50%)', trim: '#FFFFFF', crest: '#FFFFFF', glow: '#D6001C', added: 20 }
];

export const chf = (n: number): string => 'CHF\u00a0' + Math.round(n).toLocaleString('de-CH');
export const pct = (v: number): string => (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(1) + '%';
export const hexA = (h: string, a: number): string => {
  const n = parseInt(h.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
};

export type Point = [index: number, value: number];

export function down(vals: number[], max: number): Point[] {
  if (vals.length <= max) return vals.map((v, i): Point => [i, v]);
  const out: Point[] = [];
  const step = (vals.length - 1) / (max - 1);
  for (let k = 0; k < max; k++) {
    const i = Math.round(k * step);
    out.push([i, vals[i]!]);
  }
  return out;
}

export interface ChartPoint {
  x: number;
  y: number;
  v: number;
  i: number;
}

export function linePath(pairs: Point[], W: number, H: number, pad: number): { d: string; area: string; pts: ChartPoint[]; mn: number; mx: number } {
  const vs = pairs.map((p) => p[1]);
  let mn = Math.min(...vs),
    mx = Math.max(...vs);
  if (mx - mn < 1e-6) {
    mx += 1;
    mn -= 1;
  }
  const n = pairs.length;
  const pts = pairs.map((p, k): ChartPoint => ({
    x: n === 1 ? W : (k / (n - 1)) * W,
    y: pad + (1 - (p[1] - mn) / (mx - mn)) * (H - 2 * pad),
    v: p[1],
    i: p[0]
  }));
  const d = pts.map((p, k) => (k ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  return { d, area: d + ' L' + W + ' ' + H + ' L0 ' + H + ' Z', pts, mn, mx };
}

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
export const MULT: Record<string, number> = { S: 0.96, M: 1, L: 1.05, XL: 1.03, XXL: 0.93 };
export const CONDS = ['New with tags', 'Excellent', 'Very good', 'Good', 'Match-worn'];
export const SHIRTS: Shirt[] = RAW.map((s): Shirt => {
  const r = rng(s.id);
  // See marketData.js — hist/sizes/avail/owners/wants/decade/sales are all placeholder
  // synthetic data pending a real transactions integration (Phase 4.11 audit).
  const { L, hist, sizes, avail, owners, wants, decade, sales } = generateSyntheticMarketData(s, r);
  const parts = (s.player || '').split(' ');
  const num = parts.length > 1 ? parts.pop() || '' : '';
  return {
    ...s,
    L,
    hist,
    sizes,
    avail,
    owners,
    wants,
    decade,
    sales,
    pName: parts.join(' ').toUpperCase(),
    pNum: num,
    spark: linePath(down(hist.slice(-90), 32), 100, 32, 3).d,
    hay: [s.club, s.name, s.season, s.brand, s.league, s.player, s.type].join(' ').toLowerCase(),
    sku: 'KV-' + (10000 + Math.floor(r() * 89999)),
    trend: s.ch * 1.6 + wants / 900
  };
});

export const BY: Record<string, Shirt> = {};
SHIRTS.forEach((s) => (BY[s.id] = s));

export interface Filters {
  type: string[];
  league: string[];
  brand: string[];
  decade: string[];
  condition: string[];
  club: string[];
}

export const EMPTY: Filters = { type: [], league: [], brand: [], decade: [], condition: [], club: [] };
export const RANGES: Record<string, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, ALL: 9999 };
export const uniq = (k: keyof RawShirt): string[] => [...new Set(SHIRTS.map((s) => String(s[k] ?? '')))];
