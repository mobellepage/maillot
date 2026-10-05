import { describe, expect, it } from 'vitest';
import { composite, segments, toCsv, weightedChange } from '../features/index/indexMath.ts';

const rows = [
  { id: 'a', name: 'Cheap', league: 'X', type: 'New', price: 100, ch: 10, priceSource: 'estimate' },
  { id: 'b', name: 'Dear, "rare"', league: 'X', type: 'Retro', price: 300, ch: -10, priceSource: 'trades' },
  { id: 'c', name: 'Other', league: 'Y', type: 'Retro', price: 100, ch: 0, priceSource: 'estimate' }
];

describe('Shirt Index', () => {
  it('weights the change by value', () => {
    expect(weightedChange(rows)).toBeCloseTo((100 * 10 + 300 * -10 + 0) / 500);
    expect(weightedChange([])).toBe(0);
  });
  it('summarises the composite', () => {
    expect(composite(rows)).toMatchObject({ count: 3, value: 500, fromTrades: 1 });
  });
  it('groups segments, best first', () => {
    const s = segments(rows, 'type');
    expect(s.map((x) => x.name)).toEqual(['New', 'Retro']);
    expect(s[1]).toMatchObject({ count: 2, avgPrice: 200 });
  });
  it('exports CSV with quoting', () => {
    const csv = toCsv(rows);
    expect(csv.split('\n')[0]).toBe('shirt_id,name,league,type,market_price_chf,change_30d_pct,price_source');
    expect(csv).toContain('b,"Dear, ""rare""",X,Retro,300,-10,trades');
  });
});
