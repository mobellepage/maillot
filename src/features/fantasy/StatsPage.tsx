// Statistics, as in Fantasy Premier League: every jersey of the game with
// the points its club has collected this season (win 3, draw 1 — the league
// table's own points), its games, the points per game, its price and how many
// squads hold it. Search, league, a price ceiling and the sort.
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import type { ClubStat } from '../../utils/db.ts';
import { ErrorState, Notice, Page, Skeleton } from '../../ui/index.ts';
import { deltaText, priceText } from './model.ts';

type Sort = 'points' | 'ppg' | 'price' | 'picked';

export default function StatsPage() {
  const { t, lang } = usePrefs();
  usePageMeta(t('fantasy.stats.title') + ' · Fantasy', t('fantasy.stats.banner'));
  const stats = useQuery({ queryKey: ['fantasyClubStats'], queryFn: db.loadClubStats, staleTime: 300_000, retry: false });
  const [q, setQ] = useState('');
  const [league, setLeague] = useState('all');
  const [max, setMax] = useState(30);
  const [sort, setSort] = useState<Sort>('points');
  const rows = useMemo(() => stats.data ?? [], [stats.data]);
  const leagues = useMemo(() => [...new Set(rows.map((r) => r.league))].sort((a, b) => a.localeCompare(b)), [rows]);
  const key = (r: ClubStat) => (sort === 'points' ? r.points : sort === 'ppg' ? Number(r.ppg) : sort === 'price' ? Number(r.price) : r.picked_pct);
  const list = rows
    .filter((r) => (league === 'all' || r.league === league) && Number(r.price) <= max && (!q || r.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => key(b) - key(a) || b.points - a.points || a.name.localeCompare(b.name));
  const updated = rows.reduce<string | null>((a, r) => (r.updated_at && (!a || r.updated_at > a) ? r.updated_at : a), null);
  const reset = () => {
    setQ('');
    setLeague('all');
    setMax(30);
    setSort('points');
  };

  return (
    <Page>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      <h1 className="display" style={{ margin: 0, fontSize: 'clamp(28px,4vw,40px)' }}>
        {t('fantasy.stats.title')}
      </h1>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('fantasy.sq.search')} aria-label={t('fantasy.sq.search')} style={{ width: '100%', marginTop: 16 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
        <select value={league} onChange={(e) => setLeague(e.target.value)} aria-label={t('fantasy.sq.league')}>
          <option value="all">{t('fantasy.sq.allLeagues')}</option>
          {leagues.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t('fantasy.sq.sort')}>
          {(['points', 'ppg', 'price', 'picked'] as const).map((s) => (
            <option key={s} value={s}>
              {t('fantasy.stats.sort.' + s)}
            </option>
          ))}
        </select>
        <label className="fantasy-range" style={{ flex: '1 1 220px' }}>
          <span style={{ flex: 'none' }}>{t('fantasy.sq.maxValue', { n: priceText(max) })}</span>
          <input type="range" min={3} max={30} step={0.5} value={max} onChange={(e) => setMax(Number(e.target.value))} aria-label={t('fantasy.sq.maxValueLabel')} />
        </label>
        <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
          {t('fantasy.stats.reset')}
        </button>
      </div>
      <div className="fantasy-stats-banner">{t('fantasy.stats.banner')}</div>
      {stats.isLoading && <Skeleton height={400} radius={20} style={{ marginTop: 14 }} />}
      {stats.isError && <ErrorState what={t('fantasy.stats.title')} onRetry={() => stats.refetch()} />}
      {stats.data && !list.length && <Notice style={{ marginTop: 14 }}>{t('fantasy.sq.none')}</Notice>}
      {list.length > 0 && (
        <div className="card fantasy-statstable" role="table" aria-label={t('fantasy.stats.title')}>
          <div className="fantasy-statstable__row is-head" role="row">
            <span role="columnheader">{t('fantasy.stats.club')}</span>
            <span role="columnheader" title={t('fantasy.stats.priceLong')}>M</span>
            <span role="columnheader" title={t('fantasy.stats.pickedLong')}>%</span>
            <span role="columnheader" className="is-wide" title={t('fantasy.stats.recordLong')}>
              {t('fantasy.stats.record')}
            </span>
            <span role="columnheader" title={t('fantasy.stats.ppgLong')}>Ø</span>
            <span role="columnheader" title={t('fantasy.stats.pointsLong')}>{t('fantasy.stats.tp')}</span>
          </div>
          {list.map((r, i) => (
            <div key={r.club_id} className="fantasy-statstable__row" role="row">
              <span role="cell" className="fantasy-statstable__club">
                <span className="mono fantasy-statstable__rank">{i + 1}</span>
                {r.image_path ? <img src={r.image_path} alt="" loading="lazy" /> : <span className="fantasy-fixture__noimg">👕</span>}
                <span style={{ minWidth: 0 }}>
                  <b>{r.name}</b>
                  <small>{r.league}</small>
                </span>
              </span>
              <span role="cell" className="mono">
                {Number(r.price).toFixed(1)}
                {deltaText(r.delta) && <small className={Number(r.delta) > 0 ? 'is-up' : 'is-down'}> {deltaText(r.delta)}</small>}
              </span>
              <span role="cell" className="mono">
                {r.picked_pct}%
              </span>
              <span role="cell" className="mono is-wide">
                {r.played ? `${r.won}-${r.drawn}-${r.lost}` : '–'}
              </span>
              <span role="cell" className="mono">
                {Number(r.ppg).toFixed(1)}
              </span>
              <span role="cell" className="mono fantasy-statstable__tp">
                {r.points}
              </span>
            </div>
          ))}
        </div>
      )}
      {updated && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {t('fantasy.stats.updated', { date: new Date(updated).toLocaleString(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) })}
        </p>
      )}
    </Page>
  );
}
