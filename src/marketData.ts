// Market-data layer for the catalogue: price history, recent sales, owner/want counts.
//
// AUDIT NOTE (Phase 4.11): the catalogue has no real transaction feed to
// connect to yet (orders only started flowing through Supabase recently). Every number this module produces today — price history,
// "recent sales", owner/want counts — is deterministically generated from a seeded
// RNG (seeded per item id, so it's at least *stable* across reloads, not random noise
// on every render). None of it is real market activity. Previously this generation
// was inlined directly into data.js's SHIRTS mapping, which made that fact invisible
// to anyone reading the consuming code (engine.js, Detail.jsx) — the shape looked
// identical to what a real API response would look like.
//
// This module exists to do two things:
//   1. Give that synthetic generation an explicit name and a single, isolated home
//      (`generateSyntheticMarketData`), instead of being buried in the catalogue mapping.
//   2. Define the schema a real provider would need to satisfy (see `MarketData` shape
//      below) so that swapping in a real transactions API later is a one-function change
//      in data.js (replace the call to `generateSyntheticMarketData` with a real fetch
//      that returns the same shape) — no changes needed in engine.js or any view.
//
// `MARKET_DATA_MODE` / `MARKET_DATA_LABEL` are surfaced in the UI (see Detail.jsx) so the
// app doesn't silently present fabricated sales as if they were real — consistent with
// the "never claim more than is true" rule already used for verification tiers/estimates.

export const MARKET_DATA_MODE = 'synthetic';
export const MARKET_DATA_LABEL = 'Simulierte Marktdaten (Demo-Datensatz)';

export interface MarketSale {
  /** days ago (offset from "today") */
  o: number;
  size: string;
  /** price in CHF at the time of sale */
  p: number;
}

/**
 * The shape any real market-data provider must return for a catalogue item,
 * so it can replace `generateSyntheticMarketData` without touching consumers.
 */
export interface MarketData {
  /** length of `hist` in days */
  L: number;
  /** daily price history, oldest → newest */
  hist: number[];
  sizes: string[];
  avail: Record<string, boolean>;
  owners: number;
  wants: number;
  decade: string;
  sales: MarketSale[];
}

/** The fields of a raw catalogue entry the generator reads. */
export interface MarketSeed {
  type: string;
  year: number;
  price: number;
  ch: number;
}

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

// Deterministic per-item PRNG (mulberry32-style), seeded from the item id string so
// output is stable across reloads/sessions instead of changing every render. Exported
// so data.js can share a single RNG instance per item across market data + other
// synthetic fields (comments, etc.) that are generated in sequence.
export function rng(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a stable, synthetic MarketData record for a raw catalogue item.
 * This is a placeholder data source — see the audit note above. It is the only
 * function in the app that should ever be used to fabricate sales/owner/want
 * numbers; a real integration replaces just this function's call site in data.ts.
 */
export function generateSyntheticMarketData(s: MarketSeed, r: () => number): MarketData {
  const L = s.type === 'New' ? (s.year >= 2026 ? 150 + Math.floor(r() * 70) : 330 + Math.floor(r() * 60)) : 730;
  const v30 = s.price / (1 + s.ch / 100);
  const A: [number, number][] = [
    [0, v30 * (s.type === 'New' ? 1.0 + r() * 0.1 : 0.62 + r() * 0.22)],
    [Math.floor(L * 0.45), v30 * (s.type === 'New' ? 0.96 + r() * 0.08 : 0.84 + r() * 0.12)],
    [Math.floor(L * 0.8), v30 * (0.96 + r() * 0.07)],
    [L - 31, v30],
    [L - 1, s.price]
  ];
  const p1 = r() * 6,
    p2 = r() * 6,
    hist: number[] = [];
  for (let i = 0; i < L; i++) {
    let k = 0;
    while (k < A.length - 2 && i > A[k + 1]![0]) k++;
    const [x0, y0] = A[k]!,
      [x1, y1] = A[k + 1]!;
    const t = (i - x0) / Math.max(1, x1 - x0);
    const base = y0 + (y1 - y0) * t;
    const n = (0.024 * Math.sin(i / 6 + p1) + 0.015 * Math.sin(i / 17 + p2) + 0.014 * (r() - 0.5)) * Math.min(1, (L - 1 - i) / 4);
    hist.push(base * (1 + n));
  }
  hist[L - 1] = s.price;

  const sizes = s.type === 'Match-worn' ? ['L'] : SIZES;
  const avail: Record<string, boolean> = {};
  sizes.forEach((z) => (avail[z] = z === 'M' || z === 'L' || r() > 0.3));
  const owners = s.type === 'Match-worn' ? 1 : Math.round(220 + r() * 3600);
  const wants = Math.round((s.type === 'Match-worn' ? 900 : owners) * (1.2 + r() * 2.2));
  const decade = s.year >= 2020 ? '2020s' : Math.floor(s.year / 10) * 10 + 's';
  const sales = [1, 3, 6, 9, 15, 22].map((o) => ({ o, size: sizes[Math.floor(r() * sizes.length)]!, p: hist[Math.max(0, L - 1 - o)]! * (0.98 + r() * 0.05) }));

  return { L, hist, sizes, avail, owners, wants, decade, sales };
}
