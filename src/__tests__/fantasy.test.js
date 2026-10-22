import { describe, expect, it } from 'vitest';
import { bestRarity, duplicateValue, isRarity, untilText } from '../features/fantasy/model.ts';
import { FANTASY } from '../config/fantasy.ts';

describe('Fantasy helpers', () => {
  it('the odds add up to 100 %', () => {
    expect(Object.values(FANTASY.odds).reduce((a, n) => a + n, 0)).toBe(100);
  });
  it('knows the rarities', () => {
    expect(isRarity('epic')).toBe(true);
    expect(isRarity('gold')).toBe(false);
  });
  it('counts down to the next pack', () => {
    const now = Date.UTC(2026, 9, 22, 12, 0);
    expect(untilText(new Date(now + 11 * 3_600_000 + 23 * 60_000).toISOString(), now)).toBe('11h 23m');
    expect(untilText(new Date(now + 5 * 60_000).toISOString(), now)).toBe('5m');
    expect(untilText(new Date(now - 1000).toISOString(), now)).toBe('now');
    expect(untilText(null, now)).toBeNull();
  });
  it('values a pack’s duplicates by rarity', () => {
    const cards = [
      { rarity: 'common', duplicate: true },
      { rarity: 'legendary', duplicate: true },
      { rarity: 'epic', duplicate: false }
    ];
    expect(duplicateValue(cards)).toBe(FANTASY.duplicatePoints.common + FANTASY.duplicatePoints.legendary);
    expect(bestRarity(cards)).toBe('legendary');
    expect(bestRarity([{ rarity: 'common' }])).toBe('common');
  });
});
