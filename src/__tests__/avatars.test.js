import { describe, expect, it } from 'vitest';
import { LEGENDS, LEGEND_BY_ID } from '../features/avatars/legends.ts';

// profiles.avatar only accepts these ids (migration 20261011171445_avatars).
const DB_RULE = /^legend-(0[1-9]|[1-4][0-9]|50)$/;

describe('legend avatars', () => {
  it('are exactly the 50 ids the database accepts', () => {
    expect(LEGENDS).toHaveLength(50);
    expect(new Set(LEGENDS.map((l) => l.id)).size).toBe(50);
    for (const l of LEGENDS) expect(l.id).toMatch(DB_RULE);
    expect(LEGEND_BY_ID['legend-01']).toBe(LEGENDS[0]);
    expect(LEGEND_BY_ID['legend-50']).toBe(LEGENDS[49]);
  });

  it('use real colours throughout', () => {
    for (const l of LEGENDS) for (const c of [l.skin, l.hairColor, l.kit, l.trim, l.bg]) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
