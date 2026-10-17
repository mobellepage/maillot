// Discover — the app, not a teaser. Search first, then the library's leagues
// as categories, other collectors' collections to follow, today's puzzle and
// the market. Visitors get the pitch at the very end; members get their
// wishlist and recommendations instead (their own collection lives on My
// collection).
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useCatalog } from '../catalog/useCatalog.ts';
import { BY, type Shirt } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { SectionHeader, Skeleton } from '../../ui/index.ts';
import { ShirtGrid, ShirtRow } from '../catalog/ShirtGrid.tsx';
import { useCollection } from '../vault/useCollection.ts';
import { useWatchlist } from '../watchlist/useWatchlist.ts';
import { Hero } from './Hero.tsx';
import { Categories } from './Categories.tsx';
import { Eras } from '../discover/Eras.tsx';
import { Legends } from '../discover/Legends.tsx';
import { PopularToday } from '../discover/PopularToday.tsx';
import { DiscoverCollectors } from './DiscoverCollectors.tsx';
import { HomeBento } from './HomeBento.tsx';
import { HomePlay } from './HomePlay.tsx';
import { MemberHome } from './MemberHome.tsx';
import { Outro } from './Outro.tsx';
import { SecondLife } from './SecondLife.tsx';
import { TopCollectors } from './TopCollectors.tsx';
import { IndexTicker } from './IndexTicker.tsx';
import { Movers } from './Movers.tsx';
import { NewArrivals } from './NewArrivals.tsx';
import { useHomeLists } from './useHomeLists.ts';

const section = { maxWidth: 1360, margin: '0 auto', padding: 'clamp(48px,6vw,88px) var(--gutter) 0' } as const;

/** A stored sign-in exists: while it's being read, don't flash the visitor page at a member. */
function signedInBefore(): boolean {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  } catch {
    return false;
  }
}

export default function HomePage() {
  useCatalog(); // re-render when the live catalogue loads
  usePageMeta(null);
  const { user, loading } = useSession();
  if (loading && typeof window !== 'undefined' && signedInBefore())
    return (
      <main id="main" style={{ maxWidth: 1360, margin: '0 auto', padding: '48px var(--gutter)' }}>
        <Skeleton height={300} radius={24} />
      </main>
    );
  return user ? <MemberPage /> : <VisitorPage />;
}

function VisitorPage() {
  const { trending } = useHomeLists();
  return (
    <main id="main" style={{ animation: 'kvIn .45s ease both' }}>
      <Hero />
      <Categories />
      <PopularToday />
      <Eras />
      <Legends />
      <Trending shirts={trending} grid />
      <DiscoverCollectors />
      <HomePlay />
      <HomeBento />
      <SecondLife />
      <TopCollectors />
      {/* The market in numbers: index, biggest moves, new in the catalogue. */}
      <div style={{ marginTop: 'clamp(48px,6vw,88px)' }}>
        <IndexTicker />
      </div>
      <Movers />
      <NewArrivals />
      <Outro />
    </main>
  );
}

function MemberPage() {
  const { t } = usePrefs();
  const { items } = useCollection();
  const watch = useWatchlist();
  const { trending, recommended } = useHomeLists(items.map((c) => c.catalogId).filter((x): x is string => !!x));
  const wanted = watch.ids.map((id) => BY[id]).filter((s): s is Shirt => !!s);
  return (
    <main id="main" style={{ animation: 'kvIn .45s ease both' }}>
      <MemberHome />
      <Categories />
      <PopularToday />
      <DiscoverCollectors />
      <Eras />
      <Legends />
      <HomePlay />
      {wanted.length > 0 && (
        <section aria-labelledby="wish-title" style={section}>
          <SectionHeader
            id="wish-title"
            eyebrow={t('home.me.wishEyebrow')}
            title={t('home.me.wishTitle')}
            action={
              <Link to="/watchlist" className="nav-link" style={{ padding: '8px 0' }}>
                {t('home.me.wishAll')}
              </Link>
            }
          />
          <ShirtRow shirts={wanted} />
        </section>
      )}
      {recommended.length > 0 && (
        <section aria-labelledby="rec-title" style={section}>
          <SectionHeader id="rec-title" eyebrow={t('home.rec.eyebrow')} title={t('home.rec.title')} />
          <ShirtRow shirts={recommended} />
        </section>
      )}
      <Trending shirts={trending} />
      <div style={{ marginTop: 'clamp(48px,6vw,88px)' }}>
        <IndexTicker />
      </div>
      <Movers />
      <NewArrivals />
    </main>
  );
}

/** At most this many shirts in the grid, cut to whole rows (7 columns on a desktop → 7, 2 on a phone → 6). */
const GRID_MAX = 7;

/** How many columns the grid inside `ref` lays out right now. */
function useGridColumns(ref: React.RefObject<HTMLElement | null>) {
  const [cols, setCols] = useState(GRID_MAX);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const grid = el.querySelector('ul');
      if (grid) setCols(Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}

function Trending({ shirts, grid = false }: { shirts: Shirt[]; grid?: boolean }) {
  const { t } = usePrefs();
  const wrap = useRef<HTMLDivElement>(null);
  const cols = useGridColumns(wrap);
  const shown = grid ? shirts.slice(0, Math.max(cols, Math.floor(GRID_MAX / cols) * cols)) : shirts;
  return (
    <section aria-labelledby="trending-title" style={{ ...section, padding: grid ? 'clamp(24px,3vw,40px) var(--gutter) 0' : section.padding }}>
      <SectionHeader
        id="trending-title"
        eyebrow={t('home.trending.eyebrow')}
        title={t('home.trending.title')}
        action={
          <Link to="/market" className="nav-link" style={{ padding: '8px 0' }}>
            {t('home.viewMarket')}
          </Link>
        }
      />
      <div ref={wrap}>{grid ? <ShirtGrid shirts={shown} /> : <ShirtRow shirts={shown} />}</div>
    </section>
  );
}
