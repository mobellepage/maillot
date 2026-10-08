import { describe, expect, it } from 'vitest';
import { placement } from '../features/vault/addshirt/studio.ts';
import { mainPhoto } from '../features/vault/model.ts';

describe('studio photo', () => {
  it('fits any cut-out into the same square, centred', () => {
    const wide = placement(900, 600, 1000);
    expect(wide.w).toBeCloseTo(780);
    expect(wide.x).toBeCloseTo(110);
    const tall = placement(500, 1000, 1000);
    expect(tall.h).toBeCloseTo(780);
    expect(tall.x + tall.w / 2).toBeCloseTo(500); // horizontally centred
  });

  it('collections show the studio photo when there is one, else the original', () => {
    expect(mainPhoto({ photos: { front: { path: 'a' }, front_studio: { path: 's' } } }).path).toBe('s');
    expect(mainPhoto({ photos: { front: { path: 'a' } } }).path).toBe('a');
    expect(mainPhoto({ photos: {} })).toBe(undefined);
  });
});
