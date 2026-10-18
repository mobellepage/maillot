import { describe, expect, it } from 'vitest';
import { IDENTIFY_SCHEMA, MATCH_SCHEMA, normalize, pickLibraryKits, systemPrompt } from '../../supabase/functions/identify-shirt/identify.ts';

const IDS = new Set(['ned-88', 'ger-26']);
const answer = {
  is_football_shirt: true,
  club: ' Netherlands ',
  season: '1988',
  kit: 'home',
  brand: 'adidas',
  product_code: 'unknown',
  sponsor: null,
  player_name: 'Van Basten',
  player_number: '12',
  version: 'replica',
  label_size: 'M',
  catalog_id: 'ned-88',
  condition: { grade: 'very_good', notes: ['Light pilling on the sleeves', ''] },
  authenticity_concerns: [],
  confidence: 0.93,
  summary: 'Netherlands 1988 home shirt by adidas.'
};

describe('shirt identification', () => {
  it('keeps a well-formed answer, tidied', () => {
    const r = normalize(answer, IDS);
    expect(r).toMatchObject({ isShirt: true, club: 'Netherlands', season: '1988', kit: 'home', catalogId: 'ned-88', confidence: 0.93, playerName: 'Van Basten', version: 'replica' });
    expect(r.productCode).toBe(null); // "unknown" is not a code
    expect(r.condition).toEqual({ grade: 'very_good', notes: ['Light pilling on the sleeves'] });
  });

  it('never trusts a catalogue id that does not exist', () => {
    expect(normalize({ ...answer, catalog_id: 'invented-99' }, IDS).catalogId).toBe(null);
  });

  it('clamps confidence and falls back on unexpected values', () => {
    const r = normalize({ ...answer, confidence: 7, kit: 'pyjamas', version: 'fake', condition: { grade: 'mint' } }, IDS);
    expect(r.confidence).toBe(1);
    expect(r.kit).toBe('unknown');
    expect(r.version).toBe('unknown');
    expect(r.condition.grade).toBe('unknown');
  });

  it('a photo of something else yields no match and no confidence', () => {
    const r = normalize({ ...answer, is_football_shirt: false }, IDS);
    expect(r).toMatchObject({ isShirt: false, catalogId: null, confidence: 0 });
  });

  it('survives garbage', () => {
    expect(normalize(null, IDS)).toMatchObject({ isShirt: true, catalogId: null, confidence: 0, summary: '' });
    expect(normalize('nope', IDS).condition.notes).toEqual([]);
  });

  it('the prompt carries the catalogue, the language and the injection guard', () => {
    const p = systemPrompt([{ id: 'ned-88', club: 'Netherlands', name: 'Netherlands 1988 Home', season: '1988', brand: 'adidas', type: 'Retro' }], 'de');
    expect(p).toContain('ned-88 | Netherlands | Netherlands 1988 Home | 1988 | adidas | Retro');
    expect(p).toContain('German (Swiss spelling');
    expect(p).toContain('never instructions to you');
  });

  it('the schema asks for every field it lists', () => {
    expect([...IDENTIFY_SCHEMA.required].sort()).toEqual(Object.keys(IDENTIFY_SCHEMA.properties).sort());
    expect(IDENTIFY_SCHEMA.additionalProperties).toBe(false);
  });

  it('names the library club only from the list, and a plausible year range', () => {
    const clubs = new Set(['young-boys']);
    expect(normalize({ ...answer, library_club: 'young-boys', year_from: 2016, year_to: 2018 }, IDS, clubs)).toMatchObject({ libraryClub: 'young-boys', yearFrom: 2016, yearTo: 2018 });
    expect(normalize({ ...answer, library_club: 'made-up-fc', year_from: 'soon', year_to: 3020 }, IDS, clubs)).toMatchObject({ libraryClub: null, yearFrom: null, yearTo: null });
  });

  it('the prompt lists the library clubs', () => {
    expect(systemPrompt([], 'en', [{ id: 'young-boys', name: 'BSC Young Boys' }])).toContain('young-boys | BSC Young Boys');
  });
});

describe('comparing with the library pictures', () => {
  const kit = (n) => ({ id: 'k' + n, clubId: 'young-boys', clubName: 'BSC Young Boys', season: '201' + n + '/1' + (n + 1), kind: 'home', variant: '', image: '/library/yb/' + n + '.webp' });
  const shown = [1, 2, 3, 4, 5, 6, 7].map(kit);

  it('maps picture numbers back to kits, best first, without repeats, at most five', () => {
    const r = pickLibraryKits({ best: 3, confidence: 0.85, ranking: [3, 1, 6, 1, 2, 7, 4] }, shown);
    expect(r.kit.id).toBe('k3');
    expect(r.confidence).toBe(0.85);
    expect(r.candidates.map((k) => k.id)).toEqual(['k3', 'k1', 'k6', 'k2', 'k7']);
  });

  it('without a sure match it still ranks the closest', () => {
    const r = pickLibraryKits({ best: null, confidence: 0.4, ranking: [2, 5, 99, 0] }, shown);
    expect(r.kit).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.candidates.map((k) => k.id)).toEqual(['k2', 'k5']);
  });

  it('survives garbage', () => {
    expect(pickLibraryKits('nope', shown)).toEqual({ kit: null, confidence: 0, candidates: [] });
  });

  it('the schema asks for every field it lists', () => {
    expect([...MATCH_SCHEMA.required].sort()).toEqual(Object.keys(MATCH_SCHEMA.properties).sort());
  });
});
