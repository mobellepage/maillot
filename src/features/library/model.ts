// How library kits are drawn and grouped. Pure, so it's unit-tested.

export const KIT_KINDS = ['home', 'away', 'third', 'fourth', 'goalkeeper', 'cup', 'european', 'training', 'special'] as const;
export type KitKind = (typeof KIT_KINDS)[number];
export const KIT_PATTERNS = ['plain', 'stripes', 'pinstripes', 'hoops', 'halves', 'quarters', 'sash', 'gradient', 'graphic'] as const;
export type KitPattern = (typeof KIT_PATTERNS)[number];

/** The leagues shown first, in this order; everything else follows as "more". */
export const TOP5 = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'] as const;

const darker = (hex: string, k = 0.82) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('');
};

/** The shirt's look (ShirtGraphic's pat/trim/crest) from a pattern and up to three colours. */
export function kitLook(pattern: string, colors: readonly string[]): { pat: string; trim: string; crest: string } {
  const a = colors[0] ?? '#FFFFFF';
  const b = colors[1] ?? darker(a, 0.7);
  const c = colors[2] ?? b;
  const pat = (
    {
      plain: `linear-gradient(180deg,${a},${darker(a)})`,
      stripes: `repeating-linear-gradient(90deg,${a} 0 11%,${b} 11% 22%)`,
      pinstripes: `repeating-linear-gradient(90deg,${a} 0 6%,${b} 6% 7%)`,
      hoops: `repeating-linear-gradient(180deg,${a} 0 10%,${b} 10% 20%)`,
      halves: `linear-gradient(90deg,${a} 0 50%,${b} 50%)`,
      quarters: `conic-gradient(from 90deg at 50% 50%,${a} 0 25%,${b} 0 50%,${a} 0 75%,${b} 0)`,
      sash: `linear-gradient(135deg,${a} 0 38%,${b} 38% 56%,${a} 56%)`,
      gradient: `linear-gradient(180deg,${a},${b})`,
      graphic: `repeating-linear-gradient(135deg,${a} 0 7%,${darker(a, 0.88)} 7% 14%)`
    } as Record<string, string>
  )[pattern] ?? `linear-gradient(180deg,${a},${darker(a)})`;
  return { pat, trim: c === a ? b : c, crest: b };
}

export interface SeasonGroup<K> {
  season: string;
  kits: K[];
}

/** Kits grouped by season (newest first), each season in kit order (home, away, third…). */
export function bySeason<K extends { season: string; season_year: number; kind: string; variant?: string }>(kits: K[]): SeasonGroup<K>[] {
  const order = (k: string) => {
    const i = (KIT_KINDS as readonly string[]).indexOf(k);
    return i < 0 ? 99 : i;
  };
  const map = new Map<string, K[]>();
  for (const k of [...kits].sort((x, y) => y.season_year - x.season_year || y.season.localeCompare(x.season) || order(x.kind) - order(y.kind) || (x.variant ?? '').localeCompare(y.variant ?? ''))) {
    map.set(k.season, [...(map.get(k.season) ?? []), k]);
  }
  return [...map.entries()].map(([season, ks]) => ({ season, kits: ks }));
}

/** A valid season: "1998", "2025/26" or "1991/93". */
export const validSeason = (s: string) => /^[0-9]{4}(\/[0-9]{2})?$/.test(s.trim());

/** Message key for a kit variant ("GK 2", "Track Jacket", "V2" …) plus its number, or the raw text. */
const VARIANT_KEYS: Record<string, string> = {
  'GK Home': 'lib.v.gkHome',
  'GK Away': 'lib.v.gkAway',
  GK: 'lib.v.gk',
  'Track Jacket': 'lib.v.trackJacket',
  'Training Shirt': 'lib.v.trainingShirt',
  'Bench Jacket': 'lib.v.benchJacket',
  'Travel Polo': 'lib.v.travelPolo',
  Anniversary: 'lib.v.anniversary',
  Pride: 'lib.v.pride',
  Special: 'lib.v.special',
  'Swiss Cup': 'lib.v.swissCup',
  Home: 'lib.v.home'
};
export function variantLabel(variant: string, t: (key: string) => string): string {
  if (!variant) return '';
  const m = /^(.*?)\s*(\d+)$/.exec(variant);
  const base = m ? m[1]! : variant;
  const key = VARIANT_KEYS[base];
  if (!key) return variant;
  return t(key) + (m ? ' ' + m[2] : '');
}
