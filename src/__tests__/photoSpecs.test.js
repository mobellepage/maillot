import { describe, expect, it } from 'vitest';
import { buildPhotoSpecs } from '../addShirtData.js';

const base = { flock: { source: 'Keine' }, patches: [], signature: { signed: false }, tagsAttached: false, condition: { defects: [] }, version: 'Fan-Replica' };
const required = (f) => buildPhotoSpecs(f).filter((s) => s.required).map((s) => s.key);

describe('buildPhotoSpecs', () => {
  it('requires front, back, badge and inner label', () => {
    expect(required(base)).toEqual(['front', 'back', 'crest', 'product_code']);
  });
  it('also requires the print when the shirt has one', () => {
    expect(required({ ...base, flock: { source: 'Spieler' } })).toEqual(['front', 'back', 'crest', 'flock_closeup', 'product_code']);
  });
  it('keeps everything else optional', () => {
    const specs = buildPhotoSpecs({ ...base, patches: ['Champions League'], version: 'Match-Worn', condition: { defects: ['Flecken'] } });
    expect(specs.filter((s) => !s.required).map((s) => s.key)).toEqual(['sponsor', 'collar', 'seams', 'patch_Champions League', 'defect_Flecken', 'provenance_doc']);
  });
});
