import { describe, expect, it } from 'vitest';
import { measure } from '../features/tryon/photoInfo.ts';

/** n×n RGBA image: transparent, with a solid rectangle. */
function img(n, rect, rgb, bg = [0, 0, 0, 0]) {
  const d = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const inside = x >= rect[0] && x < rect[2] && y >= rect[1] && y < rect[3];
      d.set(inside ? [...rgb, 255] : bg, (y * n + x) * 4);
    }
  return d;
}

describe('measure', () => {
  it('finds a cut-out shirt and its colour', () => {
    expect(measure(img(100, [20, 10, 80, 90], [200, 30, 40]), 100)).toEqual({ box: { l: 0.2, t: 0.1, r: 0.8, b: 0.9 }, base: '#c81e28' });
  });
  it('also works on photos with a plain background', () => {
    const info = measure(img(100, [30, 20, 70, 80], [10, 20, 160], [245, 245, 245, 255]), 100);
    expect(info.box).toEqual({ l: 0.3, t: 0.2, r: 0.7, b: 0.8 });
  });
  it('gives up on an empty picture', () => {
    expect(measure(img(50, [0, 0, 0, 0], [0, 0, 0]), 50)).toBeNull();
  });
});
