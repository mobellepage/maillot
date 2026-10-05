import { Link } from 'react-router';
import { useCatalog } from '../catalog/useCatalog.ts';
import { BY } from '../../data.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { SectionHeader } from '../../ui/index.ts';
import { ShirtGrid } from '../catalog/ShirtGrid.tsx';
import { useCollection } from '../vault/useCollection.ts';
import { Hero } from './Hero.tsx';
import { IndexTicker } from './IndexTicker.tsx';
import { Movers } from './Movers.tsx';
import { NewArrivals } from './NewArrivals.tsx';
import { useHomeLists } from './useHomeLists.ts';

const section = { maxWidth: 1360, margin: '0 auto', padding: 'clamp(48px,6vw,88px) var(--gutter) 0' } as const;

export default function HomePage() {
  useCatalog(); // re-render when the live catalogue loads
  usePageMeta(null);
  const { t } = usePrefs();
  const { items } = useCollection();
  const { trending, recommended } = useHomeLists(items.map((c) => c.catalogId).filter((x): x is string => !!x));
  return (
    <main id="main" style={{ animation: 'kvIn .45s ease both' }}>
      <Hero featured={BY['ger-26']!} />
      <IndexTicker />
      {recommended.length > 0 && (
        <section aria-labelledby="rec-title" style={section}>
          <SectionHeader id="rec-title" eyebrow={t('home.rec.eyebrow')} title={t('home.rec.title')} />
          <ShirtGrid shirts={recommended} />
        </section>
      )}
      <section aria-labelledby="trending-title" style={section}>
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
        <ShirtGrid shirts={trending} />
      </section>
      <Movers />
      <NewArrivals />
    </main>
  );
}
