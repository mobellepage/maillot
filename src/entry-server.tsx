// Build-time prerender (scripts/prerender.mjs): renders public routes to
// static HTML so the first paint doesn't wait for JavaScript, and so link
// previews and search engines see real content. Signed-in pages aren't
// prerendered — they depend on the visitor.
import { prerender } from 'react-dom/static';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient } from '@tanstack/react-query';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { routes } from './app/router.tsx';
import { AppProviders } from './app/AppProviders.tsx';
import { EN } from './i18n/index.ts';
import { ssrHead } from './lib/meta.ts';
import { BY, SHIRTS } from './data.ts';
import { ShirtGraphic } from './ui/ShirtGraphic.tsx';
import * as db from './utils/db.ts';
import { setClient } from './utils/supabase.ts';
import type { Database } from './types/database.ts';
import { ERAS, LEGEND_BY, LEGENDS } from './features/discover/model.ts';
import { demoEvents, fromEventRow, fromRow, isReservation, orderEvents, type Exemplar } from './features/market/exemplars/model.ts';
import { composeFeed } from './features/feed/compose.ts';
import { rng } from './marketData.ts';
import { SHOW_DEMO_EXEMPLARS } from './config/rules.ts';

export const PATHS = [
  '/',
  '/market',
  '/library/catalog',
  '/sell',
  '/authentication',
  '/price-index',
  '/developers',
  '/verify',
  '/help',
  '/legal/terms',
  '/legal/privacy',
  '/legal/imprint',
  '/library',
  '/library/catalog',
  '/feed',
  '/daily',
  '/designer',
  ...LEGENDS.map((l) => '/legends/' + l.slug),
  ...ERAS.map((e) => '/era/' + e.decade),
  ...SHIRTS.map((s) => '/shirt/' + s.id)
];

// The build reads with the service role (a server-side secret) when it has
// it: then the visitors' read throttle doesn't apply, and every club of the
// library gets its page. Without it, only the featured clubs (well within
// the throttle).
let fullLibrary = false;
export async function readWithServiceRole(url: string, key: string): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js');
  setClient(createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  fullLibrary = true;
}

let clubList: ReturnType<typeof db.loadKitClubs> | null = null;
const loadClubs = () => (clubList ??= db.loadKitClubs());

/** Every public page, including the clubs of the kit library (from the database; without it, just the fixed ones). */
export async function paths(): Promise<string[]> {
  const clubs = await loadClubs().catch(() => []);
  return [...PATHS, ...clubs.filter((c) => fullLibrary || c.featured).map((c) => '/library/' + c.id)];
}

// Loaded once per build: the marketplace's real shirts (for counts and a model's offers).
let marketRows: ReturnType<typeof db.loadMarketExemplars> | null = null;
const loadRows = () => (marketRows ??= db.loadMarketExemplars().catch(() => []));
const realExemplars = async (): Promise<Exemplar[]> => (await loadRows()).map(fromRow);

/** incomplete: the page's data couldn't be loaded — better no static page than an empty one. */
type Seo = { image?: string; jsonLd?: object[]; incomplete?: boolean };

/** Breadcrumbs as schema.org data: [name, path] pairs, absolute URLs added by the prerender. */
const crumbs = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: '{SITE}' + path }))
});

/**
 * Puts into the page's query cache what the page itself would load, so the
 * static HTML has the real content (kits, names, pictures, links) — and
 * returns what the head needs beyond title and description.
 */
async function preload(path: string, qc: QueryClient): Promise<Seo> {
  const put = async <T,>(key: unknown[], load: () => Promise<T>) => {
    try {
      const data = await load();
      qc.setQueryData(key, data);
      return data;
    } catch {
      return undefined;
    }
  };
  let m: RegExpMatchArray | null;
  if (path === '/library') {
    const [clubs] = await Promise.all([put(['kitClubs'], loadClubs), put(['kitCounts'], db.loadKitCounts)]);
    return { incomplete: !clubs, jsonLd: [crumbs([['Maillot', '/'], ['Kit library', '/library']])] };
  }
  if ((m = path.match(/^\/library\/([^/]+)$/)) && m[1] !== 'catalog') {
    const club = m[1]!;
    const [clubs, kits] = await Promise.all([put(['kitClubs'], loadClubs), put(['clubKits', club], () => db.loadClubKits(club))]);
    const name = clubs?.find((c) => c.id === club)?.name ?? club;
    const image = kits?.find((k) => k.image_path)?.image_path ?? undefined;
    return { incomplete: !clubs || !kits, ...(image ? { image } : {}), jsonLd: [crumbs([['Maillot', '/'], ['Kit library', '/library'], [name, path]])] };
  }
  if ((m = path.match(/^\/legends\/([^/]+)$/))) {
    const legend = LEGEND_BY[m[1]!];
    if (!legend) return {};
    const kits = await put(['legendKits', legend.slug], () => db.loadLegendKits(legend.slug));
    return { incomplete: !kits, image: legend.img, jsonLd: [crumbs([['Maillot', '/'], ['Legends', '/'], [legend.name, path]])] };
  }
  if ((m = path.match(/^\/era\/(\d{4})$/))) {
    const decade = Number(m[1]);
    const era = ERAS.find((e) => e.decade === decade);
    const kits = await put(['eraKits', decade, null], async () => ({ pages: [await db.loadEraKits(decade, null, 0, 48)], pageParams: [0] }));
    return { incomplete: !kits, ...(era ? { image: era.img } : {}), jsonLd: [crumbs([['Maillot', '/'], ['Eras', '/'], [decade + 's', path]])] };
  }
  if (path === '/market') {
    await put(['marketExemplars'], loadRows);
    return {};
  }
  if (path === '/feed') {
    // The same order a first-time visitor gets, without the randomness.
    await put(['feed', undefined], async () => {
      const real = (await db.loadFeedEvents().catch(() => [])).map(fromEventRow);
      const events = orderEvents(SHOW_DEMO_EXEMPLARS ? [...real, ...demoEvents()] : real, { models: new Set(), kits: new Set() });
      const kits = await db.loadFeedKits([], []).catch(() => []);
      return composeFeed({ events, kits, listings: [], catalog: [], liked: [], seen: new Set(), rand: rng('feed-ssr') });
    });
    return {};
  }
  if ((m = path.match(/^\/shirt\/([^/]+)$/))) {
    const s = BY[m[1]!];
    if (!s) return {};
    const list = await realExemplars();
    qc.setQueryData(['marketExemplars'], await loadRows());
    const forSale = list.filter((e) => e.catalogId === s.id && e.status === 'forsale' && e.price !== null && !isReservation(e));
    const prices = forSale.map((e) => e.price!);
    const product = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: s.name,
      brand: { '@type': 'Brand', name: s.brand },
      sku: s.sku,
      category: 'Football shirt',
      description: `${s.name} (${s.season}, ${s.brand}) — market value of a very good replica and the shirts in collections on Maillot.`,
      image: ['{OG}'],
      ...(prices.length
        ? { offers: { '@type': 'AggregateOffer', priceCurrency: 'CHF', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability: 'https://schema.org/InStock', url: '{SITE}/market?shirt=' + s.id } }
        : {})
    };
    return { jsonLd: [product, crumbs([['Maillot', '/'], ['Catalogue', '/library/catalog'], [s.league, '/library/catalog?league=' + encodeURIComponent(s.league)], [s.name, path]])] };
  }
  return {};
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out + decoder.decode();
    out += decoder.decode(value, { stream: true });
  }
}

export async function render(path: string): Promise<{ html: string; title: string; description: string } & Seo> {
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request('https://maillot.app' + path));
  if (context instanceof Response) throw new Error('unexpected redirect for ' + path);
  const router = createStaticRouter(handler.dataRoutes, context);
  ssrHead.title = '';
  ssrHead.description = '';
  // Queries never run on the server; the page reads what preload put in the cache.
  const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  const seo = await preload(path, queryClient);
  const { prelude } = await prerender(
    <AppProviders queryClient={queryClient} initialMessages={{ lang: 'en', dict: EN }}>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </AppProviders>
  );
  return { html: await streamToString(prelude), title: ssrHead.title, description: ssrHead.description, ...seo };
}

/** A shirt's illustration as static HTML, for the link-preview images (scripts/brand-assets.mjs). */
export function shirtArt(id: string) {
  const s = SHIRTS.find((x) => x.id === id);
  if (!s) throw new Error('unknown shirt ' + id);
  const html = renderToStaticMarkup(<ShirtGraphic hero pat={s.pat} trim={s.trim} crest={s.crest} />);
  // photo: the studio base path or a library picture (catalogPhotos.ts), for link previews.
  return { id: s.id, name: s.name, brand: s.brand, season: s.season, type: s.type, glow: s.glow, html, photo: s.photo ?? null };
}
