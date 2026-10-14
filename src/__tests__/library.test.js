import { describe, expect, it } from 'vitest';
import { bySeason, kitLook, validSeason } from '../features/library/model.ts';

describe('kit library', () => {
  it('draws kits from a pattern and the club colours', () => {
    expect(kitLook('stripes', ['#FB090B', '#000000']).pat).toBe('repeating-linear-gradient(90deg,#FB090B 0 11%,#000000 11% 22%)');
    expect(kitLook('plain', ['#FFFFFF'])).toMatchObject({ trim: '#b3b3b3', crest: '#b3b3b3' });
    expect(kitLook('unknown', ['#123456']).pat).toContain('linear-gradient(180deg,#123456');
  });
  it('groups kits by season, newest first, home before away', () => {
    const g = bySeason([
      { season: '2024/25', season_year: 2024, kind: 'away' },
      { season: '2025/26', season_year: 2025, kind: 'third' },
      { season: '2024/25', season_year: 2024, kind: 'home' }
    ]);
    expect(g.map((s) => s.season)).toEqual(['2025/26', '2024/25']);
    expect(g[1].kits.map((k) => k.kind)).toEqual(['home', 'away']);
  });
  it('accepts the usual season formats', () => {
    expect(['1998', '2025/26', '1991/93'].every(validSeason)).toBe(true);
    expect(['98', '2025-26', '2025/2026'].some(validSeason)).toBe(false);
  });
});

describe('variantLabel', () => {
  const t = (k) => ({ 'lib.v.gk': 'Kit', 'lib.v.gkAway': 'Away', 'lib.v.trackJacket': 'Track jacket' })[k] ?? k;
  it('translates known variants and keeps their number', async () => {
    const { variantLabel } = await import('../features/library/model.ts');
    expect(variantLabel('GK 2', t)).toBe('Kit 2');
    expect(variantLabel('GK Away', t)).toBe('Away');
    expect(variantLabel('Track Jacket 2', t)).toBe('Track jacket 2');
    expect(variantLabel('V2', t)).toBe('V2');
    expect(variantLabel('FA Cup Final', t)).toBe('lib.v.faCupFinal');
    expect(variantLabel('Training Sweatshirt 2', t)).toBe('lib.v.trainingSweatshirt 2');
    expect(variantLabel('', t)).toBe('');
  });
});
