// Standings: my division this cup (promotion and relegation zones), the
// cup overall, and the season's ranking for the honour.
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { ErrorState, Notice, Page, Segmented, Skeleton } from '../../ui/index.ts';
import { StandingsTable } from './StandingsTable.tsx';

type Tab = 'division' | 'cup' | 'season';
const PROMOTE_PCT = 20;
const RELEGATE_PCT = 20;

export default function StandingsPage() {
  const { t } = usePrefs();
  const { user } = useSession();
  usePageMeta(t('fantasy.st.title') + ' · Fantasy', t('fantasy.st.body'));
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'division';
  const me = useQuery({ queryKey: ['fantasyStanding', user?.id], queryFn: db.loadMyStanding, staleTime: 30_000, retry: false });
  const s = me.data;
  const division = useQuery({ queryKey: ['fantasyTable', 'division', s?.division_id, s?.cup_id], queryFn: () => db.loadTable('division', String(s!.division_id), String(s!.cup_id)), enabled: !!s?.division_id, staleTime: 30_000, retry: false });
  const cup = useQuery({ queryKey: ['fantasyTable', 'overall', s?.cup_id], queryFn: () => db.loadTable('overall', 'all', String(s!.cup_id)), enabled: !!s && tab === 'cup', staleTime: 30_000, retry: false });
  const season = useQuery({ queryKey: ['fantasyTable', 'season', s?.season_id], queryFn: () => db.loadTable('season', String(s!.season_id), String(s!.season_id)), enabled: !!s && tab === 'season', staleTime: 30_000, retry: false });
  return (
    <Page>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: 0 }}>
        {t('fantasy.st.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', marginTop: 8, maxWidth: 640, lineHeight: 1.5 }}>{t('fantasy.st.body')}</p>
      {me.isLoading && <Skeleton height={200} radius={20} style={{ marginTop: 18 }} />}
      {me.isError && <ErrorState what={t('fantasy.st.title')} onRetry={() => me.refetch()} />}
      {s && (
        <>
          <div className="fantasy-stats" style={{ marginTop: 16 }}>
            <span className="fantasy-stat">
              <b>{s.division_number ? t('fantasy.st.division', { n: s.division_number }) : '–'}</b>
              <small>{s.division_rank ? t('fantasy.st.myRank', { rank: s.division_rank, n: s.division_size ?? 0 }) : t('fantasy.st.noDivision')}</small>
            </span>
            <span className="fantasy-stat">
              <b>{s.cup_points}</b>
              <small>{s.cup_name}</small>
            </span>
            <span className="fantasy-stat">
              <b>{s.season_points}</b>
              <small>{t('fantasy.st.season', { season: s.season_name })}</small>
            </span>
          </div>
          <div style={{ marginTop: 14 }}>
            <Segmented label={t('fantasy.st.title')} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} options={[{ value: 'division', label: s.division_number ? t('fantasy.st.division', { n: s.division_number }) : t('fantasy.st.division', { n: '–' }) }, { value: 'cup', label: t('fantasy.st.cup', { cup: s.cup_name }) }, { value: 'season', label: t('fantasy.st.season', { season: s.season_name }) }]} />
          </div>
          <section style={{ marginTop: 16 }}>
            {tab === 'division' &&
              (s.division_id ? (
                <>
                  {division.isLoading && <Skeleton height={200} radius={18} />}
                  <StandingsTable rows={division.data ?? []} empty={t('fantasy.st.empty')} promote={s.division_number && s.division_number > 1 ? Math.ceil(((division.data?.length ?? 0) * PROMOTE_PCT) / 100) : 0} relegate={Math.floor(((division.data?.length ?? 0) * RELEGATE_PCT) / 100)} />
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                    <span className="fantasy-zone fantasy-zone--up" /> {t('fantasy.st.promote')} · <span className="fantasy-zone fantasy-zone--down" /> {t('fantasy.st.relegate')}
                  </p>
                </>
              ) : (
                <Notice>{t('fantasy.st.noDivision')}</Notice>
              ))}
            {tab === 'cup' && (cup.isLoading ? <Skeleton height={200} radius={18} /> : <StandingsTable rows={cup.data ?? []} empty={t('fantasy.st.empty')} />)}
            {tab === 'season' && (season.isLoading ? <Skeleton height={200} radius={18} /> : <StandingsTable rows={season.data ?? []} empty={t('fantasy.st.empty')} />)}
          </section>
        </>
      )}
    </Page>
  );
}
