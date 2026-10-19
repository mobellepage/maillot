import { describe, expect, it } from 'vitest';
import { highlightsFirst } from '../features/vault/model.ts';

describe('highlightsFirst', () => {
  it('puts highlights first, in the order they were marked, and keeps the rest in place', () => {
    const items = [{ id: 'a' }, { id: 'b', highlightedAt: 300 }, { id: 'c' }, { id: 'd', highlightedAt: 100 }, { id: 'e', highlightedAt: null }];
    expect(highlightsFirst(items).map((x) => x.id)).toEqual(['d', 'b', 'a', 'c', 'e']);
  });
});
