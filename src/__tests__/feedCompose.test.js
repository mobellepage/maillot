import { describe, expect, it } from 'vitest';
import { composeFeed } from '../features/feed/compose.ts';

const catalog = [
  { id: 'nap', club: 'Napoli', league: 'Serie A', type: 'Retro' },
  { id: 'juv', club: 'Juventus', league: 'Serie A', type: 'Retro' },
  { id: 'liv', club: 'Liverpool', league: 'Premier League', type: 'New' },
  { id: 'yb', club: 'BSC Young Boys', league: 'Swiss Super League', type: 'New' },
  { id: 'fcb', club: 'FC Basel', league: 'Swiss Super League', type: 'New' }
];
const news = (key) => ({ key, kind: 'added', at: '2026-10-10', oldPrice: null, newPrice: null, exemplar: { id: key, owner: 'anna' } });
// A fixed sequence instead of Math.random, so the order is reproducible.
const seq = (xs) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe('composeFeed', () => {
  it('shows news from collections in the order given, a filler after every three', () => {
    const events = ['e1', 'e2', 'e3', 'e4'].map(news);
    const feed = composeFeed({ events, catalog: catalog.slice(0, 2), liked: [], seen: new Set(), rand: seq([0.1, 0.5]) });
    expect(feed.map((i) => i.kind)).toEqual(['exemplar', 'exemplar', 'exemplar', 'catalog', 'exemplar', 'catalog']);
    expect(feed.filter((i) => i.kind === 'exemplar').map((i) => i.key)).toEqual(['e1', 'e2', 'e3', 'e4']);
  });

  it('is never empty: with no news and no library it shows the catalogue', () => {
    expect(composeFeed({ catalog, liked: [], seen: new Set() })).toHaveLength(catalog.length);
  });

  it('leans towards the leagues and kinds picked at sign-up, before any like', () => {
    let swissFirst = 0;
    for (let i = 0; i < 400; i++) {
      const feed = composeFeed({ catalog, liked: [], seen: new Set(), interests: { leagues: ['Swiss Super League'], types: [] } });
      if (catalog.find((c) => c.id === feed[0].shirtId).league === 'Swiss Super League') swissFirst++;
    }
    // Two of five shirts are Swiss: 40 % by chance, clearly more with the interest.
    expect(swissFirst / 400).toBeGreaterThan(0.5);
  });

  it('puts what matches your likes first more often, and seen items further back', () => {
    let likedFirst = 0;
    let seenFirst = 0;
    for (let i = 0; i < 400; i++) {
      const a = composeFeed({ catalog, liked: ['yb'], seen: new Set() });
      if (a[0].shirtId === 'fcb' || a[0].shirtId === 'yb') likedFirst++;
      const b = composeFeed({ catalog, liked: [], seen: new Set(['c:nap', 'c:juv', 'c:liv', 'c:yb']) });
      if (b[0].shirtId !== 'fcb') seenFirst++;
    }
    // Same league as a liked shirt: well above the 2-in-5 a fair draw gives.
    expect(likedFirst / 400).toBeGreaterThan(0.55);
    // The one unseen shirt usually comes first.
    expect(seenFirst / 400).toBeLessThan(0.65);
  });
});

describe('composeFeed with library kits', () => {
  const kit = (id, club, league) => ({ id, club_id: club, club_name: club, league, season: '2001/02', season_year: 2001, kind: 'home', variant: '', image_path: null });
  const kits = [kit('a', 'young-boys', 'Swiss Super League'), ...Array.from({ length: 30 }, (_, i) => kit('x' + i, 'other' + i, 'Serie A'))];
  it('swipes through the kits instead of catalogue shirts', () => {
    const feed = composeFeed({ catalog: [{ id: 'c1', club: 'X', league: 'Y', type: 'Retro' }], liked: [], seen: new Set(), kits });
    expect(feed.every((i) => i.kind === 'kit')).toBe(true);
    expect(feed).toHaveLength(31);
  });
  it('brings the favourite team forward', () => {
    let early = 0;
    for (let i = 0; i < 300; i++) {
      const feed = composeFeed({ catalog: [], liked: [], seen: new Set(), kits, interests: { club: 'young-boys' } });
      if (feed.findIndex((f) => f.kind === 'kit' && f.kit.club_id === 'young-boys') < 8) early++;
    }
    // Without a favourite it would be in the first 8 about a quarter of the time.
    expect(early).toBeGreaterThan(300 * 0.5);
  });
});
