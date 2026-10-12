import { describe, expect, it } from 'vitest';
import { composeFeed } from '../features/feed/compose.ts';

const catalog = [
  { id: 'nap', club: 'Napoli', league: 'Serie A', type: 'Retro' },
  { id: 'juv', club: 'Juventus', league: 'Serie A', type: 'Retro' },
  { id: 'liv', club: 'Liverpool', league: 'Premier League', type: 'New' },
  { id: 'yb', club: 'BSC Young Boys', league: 'Swiss Super League', type: 'New' },
  { id: 'fcb', club: 'FC Basel', league: 'Swiss Super League', type: 'New' }
];
const listing = (askId, shirtId, handle) => ({ askId, shirtId, size: 'M', amount: 100, condition: null, edition: null, player: null, photos: [], handle, dealer: false });
// A fixed sequence instead of Math.random, so the order is reproducible.
const seq = (xs) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe('composeFeed', () => {
  it('lets sellers take turns instead of showing one shop in a row', () => {
    const listings = [listing('1', 'nap', 'shop'), listing('2', 'juv', 'shop'), listing('3', 'liv', 'shop'), listing('4', 'yb', 'anna')];
    const feed = composeFeed({ listings, catalog, liked: [], seen: new Set(), rand: seq([0.1, 0.5, 0.3, 0.7, 0.2]) });
    const sellers = feed.filter((i) => i.kind === 'listing').map((i) => i.listing.handle);
    expect(sellers.slice(0, 2).sort()).toEqual(['anna', 'shop']);
  });

  it('fills in catalogue shirts without a listing, one after every three listings', () => {
    const listings = [listing('1', 'nap', 'a'), listing('2', 'juv', 'b'), listing('3', 'liv', 'c')];
    const feed = composeFeed({ listings, catalog, liked: [], seen: new Set() });
    expect(feed.map((i) => i.kind)).toEqual(['listing', 'listing', 'listing', 'catalog', 'catalog']);
    expect(feed.filter((i) => i.kind === 'catalog').map((i) => i.shirtId).sort()).toEqual(['fcb', 'yb']);
  });

  it('is never empty: with no listings it shows the catalogue', () => {
    expect(composeFeed({ listings: [], catalog, liked: [], seen: new Set() })).toHaveLength(catalog.length);
  });

  it('leans towards the leagues and kinds picked at sign-up, before any like', () => {
    let swissFirst = 0;
    for (let i = 0; i < 400; i++) {
      const feed = composeFeed({ listings: [], catalog, liked: [], seen: new Set(), interests: { leagues: ['Swiss Super League'], types: [] } });
      if (catalog.find((c) => c.id === feed[0].shirtId).league === 'Swiss Super League') swissFirst++;
    }
    // Two of five shirts are Swiss: 40 % by chance, clearly more with the interest.
    expect(swissFirst / 400).toBeGreaterThan(0.5);
  });

  it('puts what matches your likes first more often, and seen items further back', () => {
    let likedFirst = 0;
    let seenFirst = 0;
    for (let i = 0; i < 400; i++) {
      const a = composeFeed({ listings: [], catalog, liked: ['yb'], seen: new Set() });
      if (a[0].shirtId === 'fcb' || a[0].shirtId === 'yb') likedFirst++;
      const b = composeFeed({ listings: [], catalog, liked: [], seen: new Set(['c:nap', 'c:juv', 'c:liv', 'c:yb']) });
      if (b[0].shirtId !== 'fcb') seenFirst++;
    }
    // Same league as a liked shirt: well above the 2-in-5 a fair draw gives.
    expect(likedFirst / 400).toBeGreaterThan(0.55);
    // The one unseen shirt usually comes first.
    expect(seenFirst / 400).toBeLessThan(0.65);
  });
});
