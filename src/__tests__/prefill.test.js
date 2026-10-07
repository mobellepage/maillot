import { describe, expect, it } from 'vitest';
import { confidentMatch, proposedName, sellPrefill, wizardPatch } from '../features/identify/prefill.ts';

const kit = (k) => ({ home: 'Home', away: 'Away' })[k] ?? k;
const sizes = () => ['S', 'M', 'L', 'XL', 'XXL'];
const result = (over = {}) => ({
  isShirt: true, club: 'Netherlands', season: '1988', kit: 'home', brand: 'adidas', productCode: null, sponsor: null,
  playerName: 'Van Basten', playerNumber: '12', version: 'replica', labelSize: 'l', catalogId: 'ned-88',
  condition: { grade: 'very_good', notes: [] }, authenticityConcerns: [], confidence: 0.92, summary: '', ...over
});
const empty = () => ({
  catalogId: null, proposed: false, proposedClub: '', proposedSeason: '', proposedVariant: '', searchQ: '', version: '',
  size: 'M', sizeGroup: 'Herren', tagsAttached: false, condition: { grade: 8, defects: [] },
  flock: { source: 'Keine', name: '', number: '', type: 'Original (vom Verein)' }
});

describe('prefilling from a recognised shirt', () => {
  it('picks the catalogue shirt only when confident', () => {
    expect(confidentMatch(result())).toBe('ned-88');
    expect(confidentMatch(result({ confidence: 0.5 }))).toBe(null);
  });

  it('fills the wizard: shirt, edition, size, condition and print', () => {
    expect(wizardPatch(result(), empty(), kit, sizes)).toMatchObject({
      catalogId: 'ned-88', proposed: false, version: 'Fan-Replica', size: 'L',
      condition: { grade: 8, defects: [] }, flock: { source: 'Spielername & Nummer', name: 'Van Basten', number: '12' }
    });
  });

  it('proposes an uncatalogued shirt from what it recognised', () => {
    const p = wizardPatch(result({ catalogId: null, club: 'FC Thun', season: '2005-06' }), empty(), kit, sizes);
    expect(p).toMatchObject({ proposed: true, proposedClub: 'FC Thun', proposedSeason: '2005-06', proposedVariant: 'Home', searchQ: 'FC Thun 2005-06 Home' });
    expect(p.catalogId).toBeUndefined();
  });

  it('never overrides what the member already chose', () => {
    const p = wizardPatch(result({ catalogId: 'ger-26' }), { ...empty(), catalogId: 'ned-88', version: 'Match-Worn', flock: { source: 'Eigener Name', name: 'Mo', number: '7', type: 'x' } }, kit, sizes);
    expect(p.catalogId).toBeUndefined();
    expect(p.version).toBeUndefined();
    expect(p.flock).toBeUndefined();
  });

  it('marks new-with-tags shirts and ignores sizes it does not offer', () => {
    const p = wizardPatch(result({ condition: { grade: 'new_with_tags', notes: [] }, labelSize: '3XL' }), empty(), kit, sizes);
    expect(p.tagsAttached).toBe(true);
    expect(p.condition.grade).toBe(10);
    expect(p.size).toBeUndefined();
  });

  it('suggests condition, edition and print in the sell flow', () => {
    expect(sellPrefill(result())).toEqual({ condition: 'Very good', edition: 'Replica', player: 'Van Basten 12' });
    expect(sellPrefill(result({ condition: { grade: 'unknown', notes: [] }, version: 'unknown', playerName: null, playerNumber: null }))).toEqual({ condition: null, edition: null, player: null });
  });

  it('names an uncatalogued shirt', () => {
    expect(proposedName(result({ kit: 'unknown' }), kit)).toBe('Netherlands 1988');
  });
});
