// Fantasy, the home of the game: loads the Gameweek, the squad, the price
// moves, leagues and standing, and hands them to the view (FantasyHome).
// Visitors see what it is and a way in.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { FANTASY } from '../../config/fantasy.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { FantasyHome } from './FantasyHome.tsx';

export default function FantasyPage() {
  const { t } = usePrefs();
  usePageMeta(t('fantasy.meta'), t('fantasy.metaDesc'));
  const { user } = useSession();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const matchday = useQuery({ queryKey: ['fantasyMatchday', 'current', user?.id], queryFn: () => db.loadMatchday(), enabled: !!user, staleTime: 15_000, retry: false });
  const squad = useQuery({ queryKey: ['fantasySquad', 'current', user?.id], queryFn: () => db.loadSquadClubs(), enabled: !!user, staleTime: 15_000, retry: false });
  const moves = useQuery({ queryKey: ['fantasyMoves'], queryFn: () => db.loadPriceMoves(8), enabled: !!user, staleTime: 300_000, retry: false });
  const leagues = useQuery({ queryKey: ['fantasyLeagues', user?.id], queryFn: db.loadMyLeagues, enabled: !!user, staleTime: 30_000, retry: false });
  const standing = useQuery({ queryKey: ['fantasyStanding', user?.id], queryFn: db.loadMyStanding, enabled: !!user, staleTime: 30_000, retry: false });

  if (!user) return <Teaser />;
  return (
    <Page>
      {matchday.isLoading && <Skeleton height={260} radius={28} />}
      {matchday.isError && <ErrorState what="Fantasy" onRetry={() => matchday.refetch()} />}
      {matchday.isSuccess && <FantasyHome matchday={matchday.data} squad={squad.data ?? []} moves={moves.data ?? []} leagues={leagues.data?.length ?? null} standing={standing.data ?? null} now={now} />}
    </Page>
  );
}

/** For visitors: what the game is, and the way in. */
function Teaser() {
  const { t } = usePrefs();
  return (
    <Page narrow>
      <p className="eyebrow">Maillot</p>
      <h1 className="display display--lg">Fantasy</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 16, lineHeight: 1.55, marginTop: 10 }}>{t('fantasy.tagline')}</p>
      <ol style={{ margin: '18px 0 0', paddingLeft: 20, display: 'grid', gap: 8, fontSize: 15, lineHeight: 1.5 }}>
        <li>{t('fantasy.how.1', { n: FANTASY.squadSize, budget: FANTASY.budget })}</li>
        <li>{t('fantasy.how.2', { n: FANTASY.starters })}</li>
        <li>{t('fantasy.how.3', { win: FANTASY.points.win, draw: FANTASY.points.draw })}</li>
        <li>{t('fantasy.how.4')}</li>
      </ol>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
        <Link to="/signin" state={{ from: '/fantasy' }} className="btn btn--primary">
          {t('fantasy.signin')}
        </Link>
        <Link to="/fantasy/rules" className="btn btn--secondary">
          {t('fantasy.rules.title')}
        </Link>
      </div>
      <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>{t('fantasy.noMoney')}</p>
    </Page>
  );
}
