// The marketplace lists exemplars: one physical shirt in someone's
// collection, with its own version, size, condition, verification and
// status — never a catalogue model (that's the library). Real ones come
// from market_exemplars(); demo ones fill the market until launch
// (config/rules.ts SHOW_DEMO_EXEMPLARS). Pure, unit-tested.
import { BY, SHIRTS, TODAY, type Shirt } from '../../../data.ts';
import { rng } from '../../../marketData.ts';
import { VERSIONS } from '../../../config/rules.ts';
import type { Photo } from '../../../types/domain.ts';
import type { FeedEventRow, MarketExemplarRow } from '../../../utils/db.ts';
import { marketValue } from '../../catalog/model.ts';

export type VersionKey = (typeof VERSIONS)[number]['key'];
export type Status = 'forsale' | 'offers' | 'public';
export type Verification = 'self' | 'precheck' | 'expert';

export interface Exemplar {
  id: string;
  demo: boolean;
  owner: string;
  avatar: string | null;
  dealer: boolean;
  catalogId: string | null;
  kitId: string | null;
  kitImage: string | null;
  photo: Photo | undefined;
  name: string;
  club: string | null;
  season: string | null;
  league: string | null;
  version: VersionKey | null;
  size: string | null;
  grade: number | null;
  print: string | null;
  status: Status;
  /** Asking price, for sale only. */
  price: number | null;
  verification: Verification;
  verified: boolean;
  canAsk: boolean;
  addedAt: string;
}

/** The version names used across the app (wizard, sell flow, older listings) → one key. */
export function versionKey(v: string | null | undefined): VersionKey | null {
  const s = (v ?? '').toLowerCase();
  if (!s || s === 'unbekannt' || s === 'unknown') return null;
  if (s.includes('match-worn') || s.includes('match_worn')) return 'matchWorn';
  if (s.includes('match-issued')) return 'matchIssued';
  if (s.includes('player') || s.includes('authentic')) return 'playerIssue';
  if (s.includes('replica')) return 'replica';
  return null;
}

/**
 * What the shirt is worth: the model's market value for its size times its
 * version. Match-issued and match-worn only once an expert verified it.
 * Without a catalogue model there's no market value.
 */
export function estimate(e: Pick<Exemplar, 'catalogId' | 'size' | 'version' | 'verification' | 'verified'>): { value: number | null; afterExpert: boolean } {
  const cat = e.catalogId ? BY[e.catalogId] : undefined;
  const rule = VERSIONS.find((v) => v.key === (e.version ?? 'replica'))!;
  if (rule.needsExpert && !(e.verification === 'expert' && e.verified)) return { value: null, afterExpert: true };
  if (!cat) return { value: null, afterExpert: false };
  return { value: Math.round(marketValue(cat, e.size ?? 'M') * rule.factor), afterExpert: false };
}

export const isBuyable = (e: Pick<Exemplar, 'status'>): boolean => e.status === 'forsale' || e.status === 'offers';

/** Offers and purchases run through the order system, which needs a catalogue model and a size. */
export const canTrade = (e: Pick<Exemplar, 'catalogId' | 'size' | 'demo'>): boolean => !e.demo && !!e.catalogId && !!e.size;

const KIND: Record<string, string> = { home: 'Home', away: 'Away', third: 'Third', fourth: 'Fourth', goalkeeper: 'Goalkeeper', special: 'Special', training: 'Training', cup: 'Cup', european: 'European' };

export function fromRow(r: MarketExemplarRow): Exemplar {
  const cat = r.catalog_id ? BY[r.catalog_id] : undefined;
  const fallback = [r.club, r.season, r.variant || (r.kind ? KIND[r.kind] ?? '' : '')].filter(Boolean).join(' ');
  return {
    id: r.id,
    demo: false,
    owner: r.handle,
    avatar: r.avatar,
    dealer: r.dealer,
    catalogId: r.catalog_id,
    kitId: r.kit_id,
    kitImage: r.kit_image,
    photo: r.photo_path ? { path: r.photo_path, ...(r.thumb_path ? { thumbPath: r.thumb_path } : {}) } : undefined,
    name: cat?.name ?? fallback,
    club: cat?.club ?? r.club,
    season: cat?.season ?? r.season,
    league: cat?.league ?? r.league,
    version: versionKey(r.version),
    size: r.size,
    grade: r.grade === null ? null : Number(r.grade),
    print: null,
    status: r.visibility,
    price: r.sale_price === null ? null : Number(r.sale_price),
    verification: r.verification_level === 'expert' || r.verification_level === 'precheck' ? r.verification_level : 'self',
    verified: r.verified,
    canAsk: r.inquiries_enabled !== false,
    addedAt: r.added_at
  };
}

const DEMO_OWNERS = ['demo_zurich', 'demo_bern', 'demo_basel', 'demo_geneve', 'demo_luzern', 'demo_lugano'];
const DEMO_SIZES = ['S', 'M', 'M', 'L', 'L', 'XL'];
const DAY = 864e5;

/**
 * Demo exemplars: one or two per catalogue model, with believable versions,
 * sizes, conditions and statuses, plus the match-worn Kaká Milan shirt the
 * catalogue used to list as a model. Deterministic, marked demo, never buyable.
 */
export function demoExemplars(shirts: Shirt[] = SHIRTS, now = TODAY): Exemplar[] {
  const out: Exemplar[] = [];
  for (const s of shirts) {
    const r = rng('demo-ex-' + s.id);
    const count = r() < 0.45 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const roll = r();
      const status: Status = roll < 0.38 ? 'forsale' : roll < 0.72 ? 'offers' : 'public';
      const version: VersionKey = s.type === 'New' && r() < 0.3 ? 'playerIssue' : 'replica';
      const want = DEMO_SIZES[Math.floor(r() * DEMO_SIZES.length)]!;
      const size = s.sizes.includes(want) ? want : s.sizes[0] ?? 'M';
      const grade = s.type === 'New' ? (r() < 0.6 ? 10 : 9) : [9, 8, 8, 7, 6][Math.floor(r() * 5)]!;
      const verification: Verification = r() < 0.5 ? 'precheck' : 'self';
      const base: Exemplar = {
        id: `demo-${s.id}-${i}`,
        demo: true,
        owner: DEMO_OWNERS[Math.floor(r() * DEMO_OWNERS.length)]!,
        avatar: null,
        dealer: false,
        catalogId: s.id,
        kitId: null,
        kitImage: null,
        photo: undefined,
        name: s.name,
        club: s.club,
        season: s.season,
        league: s.league,
        version,
        size,
        grade,
        print: null,
        status,
        price: null,
        verification,
        verified: false,
        canAsk: true,
        addedAt: new Date(now - Math.round(1 + r() * 40) * DAY).toISOString()
      };
      const value = estimate(base).value;
      out.push({ ...base, price: status === 'forsale' && value ? Math.round((value * (0.95 + r() * 0.3)) / 5) * 5 : null });
    }
  }
  if (BY['acm-0607'])
    out.push({
      id: 'demo-acm-0607-kaka',
      demo: true,
      owner: 'demo_lugano',
      avatar: null,
      dealer: false,
      catalogId: 'acm-0607',
      kitId: null,
      kitImage: null,
      photo: undefined,
      name: BY['acm-0607'].name,
      club: 'AC Milan',
      season: '2006/07',
      league: 'Serie A',
      version: 'matchWorn',
      size: 'L',
      grade: 8,
      print: 'Kaká 22',
      status: 'public',
      price: null,
      verification: 'self',
      verified: false,
      canAsk: true,
      addedAt: new Date(now - 9 * DAY).toISOString()
    });
  return out;
}

/** Condition buckets for the filter (the 1–10 scale of the add-shirt wizard). */
export const CONDITION_BUCKETS = [
  { key: 'new', min: 10, max: 10 },
  { key: 'excellent', min: 9, max: 9 },
  { key: 'veryGood', min: 8, max: 8 },
  { key: 'good', min: 6, max: 7 },
  { key: 'worn', min: 1, max: 5 }
] as const;
export type ConditionKey = (typeof CONDITION_BUCKETS)[number]['key'];

export interface MarketFilters {
  /** buyable (default): for sale and open to offers; all: every shirt in a collection. */
  status: 'buyable' | 'all';
  q: string;
  shirt: string | null;
  versions: VersionKey[];
  sizes: string[];
  conditions: ConditionKey[];
  leagues: string[];
  clubs: string[];
  verification: Verification[];
  min: number | null;
  max: number | null;
}

export const NO_FILTERS: MarketFilters = { status: 'buyable', q: '', shirt: null, versions: [], sizes: [], conditions: [], leagues: [], clubs: [], verification: [], min: null, max: null };

/** Price for sale, otherwise the estimate: what the price filter compares. */
export const shownValue = (e: Exemplar): number | null => (e.status === 'forsale' && e.price !== null ? e.price : estimate(e).value);

export function filterExemplars(list: Exemplar[], f: MarketFilters): Exemplar[] {
  const q = f.q.trim().toLowerCase();
  const person = q.startsWith('@') ? q.slice(1) : null;
  return list.filter((e) => {
    if (f.status === 'buyable' && !isBuyable(e)) return false;
    if (f.shirt && e.catalogId !== f.shirt) return false;
    if (person !== null) {
      if (!e.owner.toLowerCase().includes(person)) return false;
    } else if (q) {
      // The model's search words too (players it's known for, product codes).
      const hay = [e.name, e.club, e.season, e.league, e.owner, e.print, e.catalogId ? BY[e.catalogId]?.hay : ''].join(' ').toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    if (f.versions.length && !f.versions.includes(e.version ?? 'replica')) return false;
    if (f.sizes.length && !(e.size && f.sizes.includes(e.size))) return false;
    if (f.conditions.length && !CONDITION_BUCKETS.some((b) => f.conditions.includes(b.key) && e.grade !== null && e.grade >= b.min && e.grade <= b.max)) return false;
    if (f.leagues.length && !(e.league && f.leagues.includes(e.league))) return false;
    if (f.clubs.length && !(e.club && f.clubs.includes(e.club))) return false;
    if (f.verification.length && !f.verification.includes(e.verification)) return false;
    if (f.min !== null || f.max !== null) {
      const v = shownValue(e);
      if (v === null || (f.min !== null && v < f.min) || (f.max !== null && v > f.max)) return false;
    }
    return true;
  });
}

/** Buyable before collector's pieces, real before demo, newest first. */
export function sortExemplars(list: Exemplar[]): Exemplar[] {
  return [...list].sort((a, b) => Number(isBuyable(b)) - Number(isBuyable(a)) || Number(a.demo) - Number(b.demo) || b.addedAt.localeCompare(a.addedAt));
}

/** "X in collections, Y to buy" — for the market's description and a model's page. */
export function counts(list: Exemplar[], shirt?: string): { total: number; buyable: number } {
  const xs = shirt ? list.filter((e) => e.catalogId === shirt) : list;
  return { total: xs.length, buyable: xs.filter(isBuyable).length };
}

// ---------------------------------------------------------------------------
// Feed events: what happened to a shirt in a collection.
// ---------------------------------------------------------------------------
export type EventKind = 'added' | 'forsale' | 'offers' | 'price_drop' | 'verified';

export interface FeedEvent {
  key: string;
  kind: EventKind;
  at: string;
  oldPrice: number | null;
  newPrice: number | null;
  exemplar: Exemplar;
}

export function fromEventRow(r: FeedEventRow): FeedEvent {
  return { key: 'e:' + r.event_id, kind: r.event_kind, at: r.event_at, oldPrice: r.old_price === null ? null : Number(r.old_price), newPrice: r.new_price === null ? null : Number(r.new_price), exemplar: fromRow(r) };
}

/** Demo news for the demo shirts: each was added; some were then put up for sale, opened to offers or made cheaper. */
export function demoEvents(list: Exemplar[] = demoExemplars()): FeedEvent[] {
  const out: FeedEvent[] = [];
  for (const e of list) {
    const r = rng('demo-ev-' + e.id);
    out.push({ key: 'd:' + e.id + ':added', kind: 'added', at: e.addedAt, oldPrice: null, newPrice: null, exemplar: e });
    const later = (days: number) => new Date(new Date(e.addedAt).getTime() + days * DAY).toISOString();
    if (e.status !== 'public' && r() < 0.6) out.push({ key: 'd:' + e.id + ':' + e.status, kind: e.status, at: later(1 + Math.round(r() * 5)), oldPrice: null, newPrice: e.price, exemplar: e });
    if (e.status === 'forsale' && e.price !== null && r() < 0.35) {
      const old = Math.round((e.price * 1.12) / 5) * 5;
      out.push({ key: 'd:' + e.id + ':drop', kind: 'price_drop', at: later(7), oldPrice: old, newPrice: e.price, exemplar: e });
    }
  }
  return out;
}

/**
 * The order of the feed's collection news: shirts matching the member's
 * wishlist (watched models, liked library kits) first, then the rest; newest
 * first within each, owners taking turns so one big collection doesn't fill
 * the screen.
 */
export function orderEvents(events: FeedEvent[], wished: { models: ReadonlySet<string>; kits: ReadonlySet<string> }, seen: ReadonlySet<string> = new Set()): FeedEvent[] {
  const match = (ev: FeedEvent) => (!!ev.exemplar.catalogId && wished.models.has(ev.exemplar.catalogId)) || (!!ev.exemplar.kitId && wished.kits.has(ev.exemplar.kitId));
  const turns = (xs: FeedEvent[]) => {
    const byOwner = new Map<string, FeedEvent[]>();
    for (const ev of [...xs].sort((a, b) => Number(seen.has(a.key)) - Number(seen.has(b.key)) || b.at.localeCompare(a.at))) byOwner.set(ev.exemplar.owner, [...(byOwner.get(ev.exemplar.owner) ?? []), ev]);
    const queues = [...byOwner.values()];
    const out: FeedEvent[] = [];
    while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift()!);
    return out;
  };
  return [...turns(events.filter(match)), ...turns(events.filter((ev) => !match(ev)))];
}
