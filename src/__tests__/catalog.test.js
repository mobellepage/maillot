import { describe, expect, it } from 'vitest';
import { matchCatalogFromOcrText, estimateValue } from '../addShirtData.js';
import { BY } from '../data.ts';

describe('matchCatalogFromOcrText', () => {
  it('matches label text to the right catalogue item', () => {
    expect(matchCatalogFromOcrText('Germany 2026 Home Adidas').item.id).toBe('ger-26');
    expect(matchCatalogFromOcrText('NETHERLANDS 1988 HOME adidas').item.id).toBe('ned-88');
  });

  it('reports full confidence for a clean label and none for noise', () => {
    expect(matchCatalogFromOcrText('Germany 2026 Home Adidas').confidence).toBe(1);
    expect(matchCatalogFromOcrText('qq zz 12')).toMatchObject({ item: null, confidence: 0 });
    expect(matchCatalogFromOcrText('')).toMatchObject({ item: null, confidence: 0 });
  });
});

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
