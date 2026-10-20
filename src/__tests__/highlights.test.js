import { describe, expect, it } from 'vitest';
import { highlightsFirst } from '../features/vault/model.ts';

describe('highlightsFirst', () => {
  it('puts highlights first, in the order they were marked, and keeps the rest in place', () => {
    const items = [{ id: 'a' }, { id: 'b', highlightedAt: 300 }, { id: 'c' }, { id: 'd', highlightedAt: 100 }, { id: 'e', highlightedAt: null }];
    expect(highlightsFirst(items).map((x) => x.id)).toEqual(['d', 'b', 'a', 'c', 'e']);
  });
});

describe('libraryPicture (leads in the own collection)', () => {
  it('takes the library kit, else the catalogue photo, else nothing', async () => {
    const { libraryPicture } = await import('../features/vault/model.ts');
    expect(libraryPicture({ kitImage: '/library/yb/2018-19-home-kit.webp', catalogId: 'acm-0607' })).toBe('/library/yb/2018-19-home-kit.webp');
    expect(libraryPicture({ kitImage: null, catalogId: 'acm-0607' }, true)).toMatch(/acm-0607.*\.webp$/);
    expect(libraryPicture({ kitImage: null, catalogId: null })).toBeUndefined();
  });
});
