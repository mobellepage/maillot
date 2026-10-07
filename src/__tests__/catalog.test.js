import { describe, expect, it } from 'vitest';
import { estimateValue } from '../addShirtData.js';
import { BY } from '../data.ts';

describe('estimateValue', () => {
  const base = { catalogItem: BY['ger-26'], version: 'Fan-Replica', conditionGrade: 10, flock: { source: 'Keine' }, patches: [], signature: { signed: false } };

  it('refuses to value unverified match-worn shirts', () => {
    expect(estimateValue({ ...base, version: 'Match-Worn', verificationLevel: 'self' }).blocked).toBe(true);
    expect(estimateValue({ ...base, version: 'Match-Worn', verificationLevel: 'expert' }).blocked).toBe(false);
  });

  it('values better condition, signatures and expert verification higher', () => {
    const v = (o) => estimateValue({ ...base, verificationLevel: 'self', ...o }).mid;
    expect(v({ conditionGrade: 10 })).toBeGreaterThan(v({ conditionGrade: 5 }));
    expect(v({ signature: { signed: true, hasCoa: true } })).toBeGreaterThan(v({ signature: { signed: true, hasCoa: false } }));
    expect(v({ verificationLevel: 'expert' })).toBeGreaterThanOrEqual(v({ verificationLevel: 'self' }));
  });

  it('returns a low/mid/high band around the estimate', () => {
    const e = estimateValue({ ...base, verificationLevel: 'self' });
    expect(e.low).toBeLessThan(e.mid);
    expect(e.high).toBeGreaterThan(e.mid);
  });
});
