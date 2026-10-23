// Discover — the app, not a teaser. Search first, then the library's leagues
// as categories, other collectors' collections to follow, today's puzzle and
// the market. Visitors get the pitch at the very end; members get their
// wishlist and recommendations instead (their own collection lives on My
// collection).
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useCatalog } from '../catalog/useCatalog.ts';
import { BY, type Shirt } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { ScrollRow, SectionHeader, Skeleton } from '../../ui/index.ts';
import { ShirtRow } from '../catalog/ShirtGrid.tsx';
import { useWatchlist } from '../watchlist/useWatchlist.ts';
import { useKitLikes } from '../watchlist/useKitLikes.ts';
import { KitDisc } from '../discover/KitDisc.tsx';
import * as db from '../../utils/db.ts';
import type { KitTile } from '../../utils/db.ts';
import { Hero } from './Hero.tsx';
import { Categories } from './Categories.tsx';
import { Eras } from '../discover/Eras.tsx';
import { Legends } from '../discover/Legends.tsx';
import { PopularToday } from '../discover/PopularToday.tsx';
import { KitNews } from '../discover/KitNews.tsx';
import { DiscoverCollectors } from './DiscoverCollectors.tsx';
import { HomeBento } from './HomeBento.tsx';
import { HomePlay } from './HomePlay.tsx';
import { MemberHome } from './MemberHome.tsx';
import { Outro } from './Outro.tsx';
import { SecondLife } from './SecondLife.tsx';
import { TopCollectors } from './TopCollectors.tsx';
import { IndexTicker } from './IndexTicker.tsx';

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
  return (
    <main id="main" style={{ animation: 'kvIn .45s ease both' }}>
      <Hero />
      <HomePlay />
      <KitNews />
      <Categories />
      <PopularToday />
      <Eras />
      <Legends />
      <Trending first />
      <DiscoverCollectors />
      <HomeBento />
      <SecondLife />
      <TopCollectors />
      <div style={{ marginTop: 'clamp(48px,6vw,88px)' }}>
        <IndexTicker />
      </div>
      <Outro />
    </main>
  );
}

function MemberPage() {
  const { t } = usePrefs();
  const watch = useWatchlist();
  const likes = useKitLikes();
  const rec = useQuery({ queryKey: ['recommendedKits'], queryFn: () => db.loadRecommendedKits(12), staleTime: 10 * 60_000 });
  // The real wishlist: library kits liked on Scout or the kit page, plus watched catalogue shirts.
  const wanted = watch.ids.map((id) => BY[id]).filter((s): s is Shirt => !!s);
  const kits = likes.kits.slice(0, 12);
  const recommended = rec.data ?? [];
  return (
    <main id="main" style={{ animation: 'kvIn .45s ease both' }}>
      <MemberHome />
      <HomePlay />
      <KitNews />
      <Categories />
      <PopularToday />
      <DiscoverCollectors />
      <Eras />
      <Legends />
      {(kits.length > 0 || wanted.length > 0) && (
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
          {kits.length > 0 && (
            <div style={{ marginBottom: wanted.length ? 8 : 0 }}>
              <KitRow kits={kits} />
            </div>
          )}
          {wanted.length > 0 && <ShirtRow shirts={wanted} />}
        </section>
      )}
      {recommended.length > 0 && (
        <section aria-labelledby="rec-title" style={section}>
          <SectionHeader id="rec-title" eyebrow={t('home.rec.eyebrow')} title={t('home.rec.title')} />
          <KitRow kits={recommended} />
        </section>
      )}
      <Trending />
      <div style={{ marginTop: 'clamp(48px,6vw,88px)' }}>
        <IndexTicker />
      </div>
    </main>
  );
}

/** Kit pictures in a single row that scrolls sideways (arrows with a pointer). */
function KitRow<K extends KitTile>({ kits, sub }: { kits: K[]; sub?: (k: K) => string }) {
  const { t } = usePrefs();
  return (
    <ScrollRow className="scroll-row--discs" prevLabel={t('common.scrollPrev')} nextLabel={t('common.scrollNext')}>
      {kits.map((k) => (
        <li key={k.id}>
          <KitDisc kit={k} {...(sub ? { sub: sub(k) } : {})} />
        </li>
      ))}
    </ScrollRow>
  );
}

/** The library kits liked most on Scout lately, with their like count. */
function Trending({ first = false }: { first?: boolean }) {
  const { t } = usePrefs();
  const q = useQuery({ queryKey: ['trendingKits'], queryFn: () => db.loadTrendingKits(12), staleTime: 5 * 60_000 });
  const kits = q.data ?? [];
  if (!kits.length) return null;
  return (
    <section aria-labelledby="trending-title" style={{ ...section, padding: first ? 'clamp(24px,3vw,40px) var(--gutter) 0' : section.padding }}>
      <SectionHeader
        id="trending-title"
        eyebrow={t('home.trending.eyebrow')}
        title={t('home.trending.title')}
        action={
          <Link to="/feed" className="nav-link" style={{ padding: '8px 0' }}>
            {t('home.trending.scout')}
          </Link>
        }
      />
      <KitRow kits={kits} sub={(k) => `♥ ${k.likes} · ${k.season}`} />
    </section>
  );
}
