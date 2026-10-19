import { describe, expect, it } from 'vitest';
import { BY } from '../data.ts';
import { counts, demoEvents, demoExemplars, estimate, filterExemplars, fromEventRow, fromRow, isBuyable, NO_FILTERS, orderEvents, sortExemplars, versionKey } from '../features/market/exemplars/model.ts';

const row = (over = {}) => ({
  id: 'c1', handle: 'anna', avatar: null, dealer: false, catalog_id: 'juv-9697', kit_id: null, kit_image: null,
  club: 'Juventus', season: '1996/97', kind: 'home', variant: null, league: 'Serie A', version: 'Fan-Replica', size: 'M', grade: 8,
  visibility: 'offers', sale_price: null, verification_level: 'self', verified: false, inquiries_enabled: true,
  photo_path: 'u/items/c1/front.jpg', thumb_path: null, added_at: '2026-10-10T10:00:00Z', ...over
});

describe('marketplace exemplars', () => {
  it('reads every version name the app has used', () => {
    expect(['Fan-Replica', 'Replica', 'Player-Issue / Authentic', 'Authentic', 'Player issue', 'Match-Issued', 'Match-worn', 'Match-Worn', 'Unbekannt', null].map(versionKey)).toEqual(['replica', 'replica', 'playerIssue', 'playerIssue', 'playerIssue', 'matchIssued', 'matchWorn', 'matchWorn', null, null]);
  });

  it('values an exemplar by its size and version; match-worn only once an expert verified it', () => {
    const base = { catalogId: 'juv-9697', size: 'M', verification: 'self', verified: false };
    expect(estimate({ ...base, version: 'replica' }).value).toBe(BY['juv-9697'].price);
    expect(estimate({ ...base, version: 'playerIssue' }).value).toBe(Math.round(BY['juv-9697'].price * 1.45));
    expect(estimate({ ...base, version: 'matchWorn' })).toEqual({ value: null, afterExpert: true });
    expect(estimate({ ...base, version: 'matchWorn', verification: 'expert', verified: true }).value).toBe(Math.round(BY['juv-9697'].price * 3.2));
    expect(estimate({ ...base, catalogId: null, version: 'replica' }).value).toBeNull();
  });

  it('maps a collection row: model name, status, price only for sale', () => {
    const e = fromRow(row({ visibility: 'forsale', sale_price: 260 }));
    expect(e).toMatchObject({ name: 'Juventus 1996/97 Home', owner: 'anna', status: 'forsale', price: 260, version: 'replica', demo: false });
    expect(fromRow(row({ catalog_id: null, club: 'BSC Young Boys', season: '2018/19', variant: '' })).name).toBe('BSC Young Boys 2018/19 Home');
  });

  it('shows buyable shirts by default, everything with "all", buyable first', () => {
    const list = [fromRow(row({ id: 'a', visibility: 'public', added_at: '2026-10-12T00:00:00Z' })), fromRow(row({ id: 'b', visibility: 'offers' })), fromRow(row({ id: 'c', visibility: 'forsale', sale_price: 200 }))];
    expect(filterExemplars(list, NO_FILTERS).map((e) => e.id).sort()).toEqual(['b', 'c']);
    expect(sortExemplars(filterExemplars(list, { ...NO_FILTERS, status: 'all' })).at(-1).id).toBe('a');
    expect(counts(list)).toEqual({ total: 3, buyable: 2 });
  });

  it('filters by collector, model words, version, condition and value', () => {
    const list = [fromRow(row({ id: 'a' })), fromRow(row({ id: 'b', handle: 'ben', catalog_id: 'fra-98', club: 'France', version: 'Player-Issue / Authentic', grade: 10 }))];
    const ids = (f) => filterExemplars(list, { ...NO_FILTERS, status: 'all', ...f }).map((e) => e.id);
    expect(ids({ q: '@ben' })).toEqual(['b']);
    expect(ids({ q: 'zidane' })).toEqual(['b']);
    expect(ids({ versions: ['playerIssue'] })).toEqual(['b']);
    expect(ids({ conditions: ['veryGood'] })).toEqual(['a']);
    expect(ids({ max: BY['juv-9697'].price })).toEqual(['a']);
  });

  it('demo shirts are marked, never tradeable, and include the match-worn Kaká Milan shirt', () => {
    const demo = demoExemplars();
    expect(demo.length).toBeGreaterThan(18);
    expect(demo.every((e) => e.demo)).toBe(true);
    expect(demo.some(isBuyable)).toBe(true);
    const kaka = demo.find((e) => e.print === 'Kaká 22');
    expect(kaka).toMatchObject({ catalogId: 'acm-0607', version: 'matchWorn', status: 'public' });
    expect(demoExemplars()).toEqual(demo); // the same every time (no flicker, same on the server)
  });
});

describe('collection news in the feed', () => {
  let next = 0;
  const ev = (id, owner, at, catalog_id = 'juv-9697', kind = 'added') => fromEventRow({ ...row({ id, handle: owner, catalog_id }), event_id: ++next, event_kind: kind, event_at: at, old_price: null, new_price: null });

  it('wishlist matches first, then the newest, owners taking turns', () => {
    const list = [ev('a1', 'anna', '2026-10-10'), ev('a2', 'anna', '2026-10-12'), ev('b1', 'ben', '2026-10-11'), ev('w1', 'cleo', '2026-09-01', 'fra-98')];
    const order = orderEvents(list, { models: new Set(['fra-98']), kits: new Set() }).map((e) => e.exemplar.id);
    expect(order[0]).toBe('w1');
    expect(order.slice(1)).toEqual(['a2', 'b1', 'a1']);
  });

  it('news already seen sinks to the end of its group', () => {
    const list = [ev('a1', 'anna', '2026-10-10'), ev('a2', 'anna', '2026-10-12')];
    const seen = new Set([list[1].key]);
    expect(orderEvents(list, { models: new Set(), kits: new Set() }, seen).map((e) => e.exemplar.id)).toEqual(['a1', 'a2']);
  });

  it('demo shirts bring demo news: each was added, some put up for sale or made cheaper', () => {
    const events = demoEvents();
    expect(events.filter((e) => e.kind === 'added')).toHaveLength(demoExemplars().length);
    expect(events.every((e) => e.exemplar.demo)).toBe(true);
    const drop = events.find((e) => e.kind === 'price_drop');
    if (drop) expect(drop.oldPrice).toBeGreaterThan(drop.newPrice);
  });
});

describe('quick listing', () => {
  it('turns a typed print into the collection’s print', async () => {
    const { flockFrom } = await import('../features/sell/useSellFlow.ts');
    expect(flockFrom('Del Piero 10')).toEqual({ source: 'Spielername & Nummer', name: 'Del Piero', number: '10', type: 'Unbekannt' });
    expect(flockFrom('MOZAR')).toEqual({ source: 'Spielername & Nummer', name: 'MOZAR', number: '', type: 'Unbekannt' });
    expect(flockFrom('  ')).toEqual({ source: 'Keine' });
  });
});
