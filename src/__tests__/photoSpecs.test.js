import { describe, expect, it } from 'vitest';
import { buildPhotoSpecs, missingSalePhotos, needsSalePhotos, salePhotoKeys } from '../addShirtData.js';

const base = { flock: { source: 'Keine' }, patches: [], signature: { signed: false }, tagsAttached: false, condition: { defects: [] }, version: 'Fan-Replica' };
const required = (f) => buildPhotoSpecs(f).filter((s) => s.required).map((s) => s.key);
const forSale = (f) => buildPhotoSpecs(f).filter((s) => s.forSale).map((s) => s.key);

describe('buildPhotoSpecs', () => {
  it('a shirt in the collection needs only front and back', () => {
    expect(required(base)).toEqual(['front', 'back']);
    expect(required({ ...base, flock: { source: 'Spieler' } })).toEqual(['front', 'back']);
  });
  it('selling also needs badge and inner label', () => {
    expect(forSale(base)).toEqual(['crest', 'product_code']);
  });
  it('and the print when the shirt has one', () => {
    expect(forSale({ ...base, flock: { source: 'Spieler' } })).toEqual(['crest', 'flock_closeup', 'product_code']);
  });
  it('keeps everything else optional', () => {
    const specs = buildPhotoSpecs({ ...base, patches: ['Champions League'], version: 'Match-Worn', condition: { defects: ['Flecken'] } });
    expect(specs.filter((s) => !s.required && !s.forSale).map((s) => s.key)).toEqual(['sponsor', 'collar', 'seams', 'patch_Champions League', 'defect_Flecken', 'provenance_doc']);
  });
});

describe('sale photos', () => {
  it('lists what is still missing to sell', () => {
    expect(salePhotoKeys('Keine')).toEqual(['front', 'back', 'crest', 'product_code']);
    expect(missingSalePhotos({ front: {}, back: {} }, 'Keine')).toEqual(['crest', 'product_code']);
    expect(missingSalePhotos({ front: {}, back: {}, crest: {}, product_code: {} }, 'none')).toEqual([]);
    expect(missingSalePhotos(undefined, 'Spielername & Nummer')).toEqual(['front', 'back', 'crest', 'flock_closeup', 'product_code']);
  });
  it('only a set price needs them; offers work with front and back', () => {
    expect(['private', 'public', 'offers', 'forsale'].filter(needsSalePhotos)).toEqual(['forsale']);
  });
});
