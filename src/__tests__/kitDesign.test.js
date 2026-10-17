import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN, cleanDesign, randomDesign } from '../features/designer/model.ts';

describe('kit designs', () => {
  it('keeps a valid design as it is', () => {
    expect(cleanDesign(DEFAULT_DESIGN)).toEqual(DEFAULT_DESIGN);
  });

  it('replaces anything that is not a colour, pattern or collar', () => {
    const d = cleanDesign({ base: 'url(javascript:alert(1))', pattern: 'spirals', collar: 'turtle', accent: '#ABCDEF' });
    expect(d.base).toBe(DEFAULT_DESIGN.base);
    expect(d.pattern).toBe(DEFAULT_DESIGN.pattern);
    expect(d.collar).toBe(DEFAULT_DESIGN.collar);
    expect(d.accent).toBe('#abcdef');
  });

  it('trims texts: sponsor and name length, number digits only', () => {
    const d = cleanDesign({ sponsor: 'A'.repeat(40), name: 'yamal\u0007', number: '1a9x7' });
    expect(d.sponsor).toHaveLength(14);
    expect(d.name).toBe('YAMAL');
    expect(d.number).toBe('19');
  });

  it('draws from nothing', () => {
    expect(cleanDesign(null)).toEqual(DEFAULT_DESIGN);
    expect(cleanDesign('x')).toEqual(DEFAULT_DESIGN);
  });

  it('surprises with a design that is valid and two-coloured', () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 20; i++) {
      const d = randomDesign(rand);
      expect(cleanDesign(d)).toEqual(d);
      expect(d.accent).not.toBe(d.base);
    }
  });
});
