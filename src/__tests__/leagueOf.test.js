import { describe, expect, it } from 'vitest';
import { leagueOf } from '../features/vault/model.ts';

const clubs = [
  { name: 'BSC Young Boys', aliases: ['YB', 'Young Boys'], league: 'Swiss Super League' },
  { name: 'Atlético de Madrid', aliases: ['Atleti'], league: 'La Liga' }
];
const item = (over) => ({ catalogId: null, proposedClub: '', ...over });

describe('leagueOf', () => {
  it("uses the catalogue shirt's league", () => {
    expect(leagueOf(item({ catalogId: 'acm-0607' }), clubs)).toBe('Serie A');
  });
  it('finds a library club by name or short name, accents and case aside', () => {
    expect(leagueOf(item({ proposedClub: 'young boys' }), clubs)).toBe('Swiss Super League');
    expect(leagueOf(item({ proposedClub: 'Atletico de Madrid' }), clubs)).toBe('La Liga');
  });
  it('knows nothing of unknown clubs', () => {
    expect(leagueOf(item({ proposedClub: 'FC Nowhere' }), clubs)).toBe(null);
    expect(leagueOf(item({}), clubs)).toBe(null);
  });
});
