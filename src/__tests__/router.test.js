import { describe, expect, it } from 'vitest';
import { pathFor, stateFromPath, titleFor, PRIVATE_VIEWS } from '../utils/router.ts';

describe('router', () => {
  const pages = [
    [{ view: 'home' }, '/'],
    [{ view: 'browse' }, '/market'],
    [{ view: 'detail', id: 'ger-26' }, '/shirt/ger-26'],
    [{ view: 'sell' }, '/sell'],
    [{ view: 'profile', pTab: 'collection' }, '/vault'],
    [{ view: 'profile', pTab: 'watchlist' }, '/watchlist'],
    [{ view: 'profile', pTab: 'orders' }, '/orders'],
    [{ view: 'addshirt' }, '/vault/add'],
    [{ view: 'vaultitem', vaultItemId: 'custom-1' }, '/vault/item/custom-1'],
    [{ view: 'admin' }, '/admin'],
    [{ view: 'auth' }, '/signin']
  ];

  it.each(pages)('maps %o to %s and back', (state, path) => {
    expect(pathFor(state)).toBe(path);
    expect(stateFromPath(path)).toMatchObject(state);
  });

  it('falls back to home for unknown paths and unknown shirts', () => {
    expect(stateFromPath('/nope')).toEqual({ view: 'home' });
    expect(stateFromPath('/shirt/does-not-exist')).toEqual({ view: 'home' });
  });

  it('tolerates trailing slashes and encoded ids', () => {
    expect(stateFromPath('/orders/')).toMatchObject({ view: 'profile', pTab: 'orders' });
    expect(stateFromPath('/vault/item/custom%2D1')).toMatchObject({ vaultItemId: 'custom-1' });
  });

  it('leaves the URL alone for the public vault view', () => {
    expect(pathFor({ view: 'publicvault' })).toBeNull();
  });

  it('gives product pages a descriptive title', () => {
    expect(titleFor({ view: 'detail', id: 'ger-26' })).toMatch(/^Germany 2026 Home.*MAILLOT$/);
  });

  it('marks account pages as private', () => {
    expect([...PRIVATE_VIEWS].sort()).toEqual(['addshirt', 'admin', 'profile', 'vaultitem']);
  });
});
