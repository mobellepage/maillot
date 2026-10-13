import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER, STAGE, bbox, clipPolygon, figureHeight, geometry, jerseyOutline, sanitizeCharacter, sanitizeLooks } from '../features/tryon/character.ts';

describe('try-on character', () => {
  it('repairs whatever was stored', () => {
    expect(sanitizeCharacter(null)).toEqual(DEFAULT_CHARACTER);
    expect(sanitizeCharacter({ gender: 'x', height: 999, skin: 42, hair: 'afro', jersey: 'ned-88', glasses: 'yes' })).toMatchObject({ gender: 'm', height: 205, skin: 2, hair: 'afro', jersey: 'ned-88', glasses: false });
    expect(sanitizeCharacter({ jersey: '<script>' }).jersey).toBeNull();
  });
  it('keeps only looks with a shirt, at most twelve', () => {
    const looks = sanitizeLooks([{ jersey: 'ned-88', pants: 'shorts' }, { pants: 'jeans' }, ...Array(20).fill({ jersey: 'sui-26' })]);
    expect(looks[0]).toMatchObject({ jersey: 'ned-88', pants: 'shorts' });
    expect(looks).toHaveLength(12);
  });
  it('taller is taller, and everyone stands on the floor inside the stage', () => {
    expect(figureHeight(190)).toBeGreaterThan(figureHeight(170));
    for (const height of [150, 205]) {
      const g = geometry({ ...DEFAULT_CHARACTER, height, hair: 'afro' });
      expect(g.top - g.head.rx * 1.6).toBeGreaterThan(0);
      expect(g.ankleY).toBeLessThan(STAGE.floor);
    }
  });
  it('broad builds get wider shoulders, oversized shirts a wider and longer cut', () => {
    expect(geometry({ ...DEFAULT_CHARACTER, build: 'broad' }).sw).toBeGreaterThan(geometry({ ...DEFAULT_CHARACTER, build: 'slim' }).sw);
    const g = geometry(DEFAULT_CHARACTER);
    const reg = bbox(jerseyOutline(g, 'regular', 'm').all);
    const big = bbox(jerseyOutline(g, 'oversized', 'm').all);
    expect(big.w).toBeGreaterThan(reg.w);
    expect(big.y + big.h).toBeGreaterThan(reg.y + reg.h);
  });
  it('turns an outline into a CSS polygon relative to its box', () => {
    expect(clipPolygon([[10, 10], [20, 10], [20, 30]], { x: 10, y: 10, w: 10, h: 20 })).toBe('polygon(0% 0%,100% 0%,100% 100%)');
  });
});
