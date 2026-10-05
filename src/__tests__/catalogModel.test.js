import { describe, expect, it } from 'vitest';
import { BY, SHIRTS } from '../data.ts';
import { browse, EMPTY_FILTERS, filterGroups, indexSegments, marketValue, PRICE_MAX, related, resolveSize, search, toCard } from '../features/catalog/model.ts';

const base = { q: '', filters: EMPTY_FILTERS, min: 0, max: PRICE_MAX, sort: 'trending' };

describe('catalogue search & browse', () => {
  it('requires every word to match', () => {
    expect(search('juventus 1996').map((s) => s.id)).toEqual(['juv-9697']);
    expect(search('juventus 2026')).toEqual([]);
    expect(search('   ')).toHaveLength(SHIRTS.length);
  });

  it('combines filters with AND across groups and OR within a group', () => {
    const retro = browse({ ...base, filters: { ...EMPTY_FILTERS, type: ['Retro'] } });
    expect(retro.length).toBeGreaterThan(0);
    expect(retro.every((s) => s.type === 'Retro')).toBe(true);
    const two = browse({ ...base, filters: { ...EMPTY_FILTERS, type: ['Retro', 'Match-worn'] } });
    expect(two.length).toBeGreaterThan(retro.length);
    const retroSerieA = browse({ ...base, filters: { ...EMPTY_FILTERS, type: ['Retro'], league: ['Serie A'] } });
    expect(retroSerieA.every((s) => s.type === 'Retro' && s.league === 'Serie A')).toBe(true);
  });

  it('applies the price range, with the top of the slider meaning "and above"', () => {
    expect(browse({ ...base, max: 120 }).every((s) => s.price <= 120)).toBe(true);
    expect(browse({ ...base, min: 0, max: PRICE_MAX })).toHaveLength(SHIRTS.length);
  });

  it('sorts by price both ways', () => {
    const asc = browse({ ...base, sort: 'asc' }).map((s) => s.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = browse({ ...base, sort: 'desc' }).map((s) => s.price);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('builds filter groups whose counts add up to the catalogue', () => {
    const type = filterGroups().find((g) => g.key === 'type');
    expect(type.options.reduce((a, o) => a + o.count, 0)).toBe(SHIRTS.length);
  });
});

describe('sizes, value and related shirts', () => {
  it('falls back to M, then the only size', () => {
    expect(resolveSize(BY['ger-26'], 'XL')).toBe('XL');
    expect(resolveSize(BY['ger-26'], 'XXXL')).toBe('M');
    expect(resolveSize(BY['acm-0607'], 'M')).toBe('L'); // match-worn: one size
  });

  it('prices match-worn pieces the same regardless of size', () => {
    expect(marketValue(BY['acm-0607'], 'S')).toBe(BY['acm-0607'].price);
    expect(marketValue(BY['ger-26'], 'M')).toBe(BY['ger-26'].price);
  });

  it('never recommends the shirt itself', () => {
    expect(related(BY['ger-26']).map((s) => s.id)).not.toContain('ger-26');
  });

  it('computes index segments from the catalogue', () => {
    const all = indexSegments()[0];
    expect(all.label).toBe('index.seg.all');
    expect(all.value).toBe(Math.round(SHIRTS.reduce((a, s) => a + s.price, 0) / SHIRTS.length));
  });

  it('formats a card through the injected money formatter', () => {
    const card = toCard(BY['ger-26'], (n) => 'X' + n);
    expect(card.priceFmt).toBe('X' + BY['ger-26'].price);
    expect(card.up).toBe(true);
  });
});
