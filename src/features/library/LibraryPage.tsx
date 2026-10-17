// /library — the kit library: every club of the top five leagues (and more),
// each with its kits season by season. For inspiration: which shirt do I
// want next?
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import type { KitClub } from '../../utils/db.ts';
import { ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { ClubBand } from './ClubBand.tsx';
import { TOP5 } from './model.ts';

const NATIONS = 'National Teams';
// Tabs with their own button; every other league sits under "Other".
const TABS: readonly string[] = [...TOP5, 'Swiss Super League', NATIONS];
const OTHER = 'other';
// National teams by continent, in this order.
const REGIONS = ['Europe', 'South America', 'North & Central America', 'Africa', 'Asia', 'Oceania'] as const;

export default function LibraryPage() {
  const { t } = usePrefs();
  usePageMeta(t('lib.meta'), t('lib.metaDesc'));
  const clubs = useQuery({ queryKey: ['kitClubs'], queryFn: db.loadKitClubs, staleTime: 10 * 60_000 });
  const counts = useQuery({ queryKey: ['kitCounts'], queryFn: db.loadKitCounts, staleTime: 5 * 60_000 });
  // ?league=… (the Discover page's categories) opens that tab.
  const [params] = useSearchParams();
  const asked = params.get('league');
  const [league, setLeague] = useState<string>(asked && [...TABS, OTHER].includes(asked) ? asked : TOP5[0]);
  const [q, setQ] = useState('');

  const needle = q.trim().toLowerCase();
  const list = (clubs.data ?? []).filter((c) => (needle ? [c.name, c.country, ...(c.aliases ?? [])].join(' ').toLowerCase().includes(needle) : league === OTHER ? !TABS.includes(c.league) : c.league === league));
  const total = Object.values(counts.data ?? {}).reduce((a, n) => a + n, 0);

  return (
    <Page>
      <div className="eyebrow">{t('lib.eyebrow')}</div>
      <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,48px)', margin: '6px 0 0' }}>
        {t('lib.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, maxWidth: 680 }}>{t('lib.intro')}</p>
      {counts.data && (
        <p className="mono" style={{ fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 0' }}>
          {t('lib.stats', { kits: total, clubs: clubs.data?.length ?? 0 })}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 22 }}>
        <div className="field" style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <label htmlFor="lib-search" className="sr-only">
            {t('lib.search')}
          </label>
          <input id="lib-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('lib.search')} />
        </div>
      </div>
      {!needle && (
        <div role="group" aria-label={t('lib.leagues')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          {[...TABS, OTHER].map((l) => (
            <button key={l} type="button" className="option-btn" aria-pressed={league === l} onClick={() => setLeague(l)} style={{ padding: '8px 14px', fontSize: 13.5 }}>
              {l === OTHER ? t('lib.other') : l === NATIONS ? t('lib.nations') : l}
            </button>
          ))}
        </div>
      )}

      {clubs.isLoading && <Skeleton height={320} radius={20} style={{ marginTop: 20 }} />}
      {clubs.isError && <ErrorState what={t('lib.title')} onRetry={() => clubs.refetch()} />}
      {!needle && league === NATIONS ? (
        [...REGIONS, null].map((r) => {
          // Nations without a continent yet (new in the library) come last.
          const nations = list.filter((c) => (r ? c.region === r : !REGIONS.some((x) => x === c.region)));
          if (!nations.length) return null;
          const id = 'region-' + (r ?? 'other').replace(/\W+/g, '-');
          return (
            <section key={id} aria-labelledby={id} style={{ marginTop: 26 }}>
              <h2 id={id} className="title" style={{ margin: 0 }}>
                {r ? t('lib.region.' + r) : t('lib.other')} <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: '0.75em' }}>{nations.length}</span>
              </h2>
              <ClubGrid clubs={nations} counts={counts.data} />
            </section>
          );
        })
      ) : (
        <ClubGrid clubs={list} counts={counts.data} />
      )}
      {clubs.data && !list.length && <p style={{ color: 'var(--muted)', marginTop: 16 }}>{t('lib.noClub')}</p>}
    </Page>
  );
}

function ClubGrid({ clubs, counts }: { clubs: KitClub[]; counts: Record<string, number> | undefined }) {
  const { t } = usePrefs();
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,210px),1fr))' }}>
      {clubs.map((c) => {
        const n = counts?.[c.id] ?? 0;
        return (
          <li key={c.id}>
            <Link to={'/library/' + c.id} className="card play-card" style={{ display: 'block', padding: 16, borderRadius: 18, color: 'var(--text)', textDecoration: 'none' }}>
              <ClubBand colors={c.colors} />
              <div style={{ fontWeight: 700, fontSize: 15.5, marginTop: 12 }}>{c.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{n ? t('lib.kitCount', { n }) : t('lib.emptyClub')}</div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
