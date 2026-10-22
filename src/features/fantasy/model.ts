// Fantasy, pure helpers: what a rarity looks like, when the next pack comes,
// what a pack was worth. Unit-tested (src/__tests__/fantasy.test.js).
import { FANTASY, type Rarity } from '../../config/fantasy.ts';

export const isRarity = (s: string): s is Rarity => s in FANTASY.odds;

/** Frame colour of a card by rarity (Gold has its own look). */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa39d',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b'
};

/** "11h 23m" until a time, "now" once it's passed; null when nothing is due. */
export function untilText(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'now';
  const m = Math.ceil(ms / 60_000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

/** What a pack's duplicates are worth in Kit Points. */
export function duplicateValue(cards: { rarity: string; duplicate: boolean }[]): number {
  return cards.reduce((sum, c) => sum + (c.duplicate && isRarity(c.rarity) ? FANTASY.duplicatePoints[c.rarity] : 0), 0);
}

/** The best rarity in a pack, for the reveal's mood. */
export function bestRarity(cards: { rarity: string }[]): Rarity {
  const order: Rarity[] = ['legendary', 'epic', 'rare', 'common'];
  for (const r of order) if (cards.some((c) => c.rarity === r)) return r;
  return 'common';
}
