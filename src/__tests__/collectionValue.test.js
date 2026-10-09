import { describe, expect, it } from 'vitest';
import { publicCollectionValue } from '../features/collectors/collectionValue.ts';
import { estimateValue } from '../addShirtData.js';
import { BY } from '../data.ts';

const shirt = (over = {}) => ({ id: 'x', catalog_id: 'sui-26', version: null, grade: 8, flock: { source: 'Keine' }, patches: [], signature: { signed: false }, verification_level: 'self', ...over });

describe('publicCollectionValue', () => {
  it('sums the same estimate the owner sees in their vault', () => {
    const one = estimateValue({ catalogItem: BY['sui-26'], version: null, conditionGrade: 8, flock: { source: 'Keine' }, patches: [], signature: { signed: false }, verificationLevel: 'self' });
    expect(publicCollectionValue([shirt(), shirt({ id: 'y' })])).toEqual({ total: one.mid * 2, counted: 2 });
  });

  it('skips shirts without a condition grade and blocked estimates (unverified match-worn)', () => {
    expect(publicCollectionValue([shirt({ grade: null }), shirt({ version: 'Match-Worn' })])).toEqual({ total: 0, counted: 0 });
  });

  it('copes with missing valuation inputs', () => {
    expect(publicCollectionValue([shirt({ flock: null, patches: null, signature: null, verification_level: null })]).counted).toBe(1);
  });
});
