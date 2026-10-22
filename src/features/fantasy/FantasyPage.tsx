// Fantasy, the home of the game: loads the player's state, their Gold cards
// and what's not Gold yet, and hands it to the view (FantasyHome). Opens
// packs and converts duplicates. Visitors see what it is and a way in.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { FANTASY } from '../../config/fantasy.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { PackCard } from '../../utils/db.ts';
import { ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { FantasyHome } from './FantasyHome.tsx';
import { PackReveal } from './PackReveal.tsx';
import { useFantasy } from './useFantasy.ts';

export default function FantasyPage() {
  const { t } = usePrefs();
  usePageMeta(t('fantasy.meta'), t('fantasy.metaDesc'));
  const { user, state, missions, cardsByRarity, open, convert } = useFantasy();
  const toast = useToast();
  const [pack, setPack] = useState<PackCard[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const gold = state.data?.gold ?? 0;
  const cards = useQuery({ queryKey: ['fantasyCards', user?.id], queryFn: db.loadFantasyCards, enabled: !!user && gold > 0, staleTime: 60_000, retry: false });
  const todo = useQuery({ queryKey: ['fantasyGoldTodo', user?.id], queryFn: db.loadGoldTodo, enabled: !!user, staleTime: 60_000, retry: false });

  const openPack = async (extra: boolean) => {
    try {
      setPack(await open.mutateAsync(extra));
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast(code === 'P0461' ? t('fantasy.err.points') : code === 'P0460' ? t('fantasy.err.limit') : code === 'P0462' ? t('fantasy.err.noPack') : t('fantasy.err.failed'));
    }
  };
  const convertAll = () => convert.mutateAsync(undefined).then((p) => toast(t('fantasy.dup.converted', { points: p })));

  if (!user) return <Teaser />;
  return (
    <Page>
      {state.isLoading && <Skeleton height={260} radius={28} />}
      {state.isError && <ErrorState what="Fantasy" onRetry={() => state.refetch()} />}
      {state.data && (
        <FantasyHome
          s={state.data}
          missions={missions}
          cardsByRarity={cardsByRarity}
          goldCards={(cards.data ?? []).filter((c) => c.gold)}
          todo={todo.data ?? []}
          now={now}
          opening={open.isPending}
          converting={convert.isPending}
          onOpen={openPack}
          onConvert={convertAll}
        />
      )}
      {pack && <PackReveal cards={pack} onConvert={convertAll} onClose={() => setPack(null)} />}
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
        <li>{t('fantasy.how.1', { n: FANTASY.cardsPerPack, h: FANTASY.packIntervalHours })}</li>
        <li>{t('fantasy.how.2')}</li>
        <li>{t('fantasy.how.3')}</li>
        <li>{t('fantasy.how.4')}</li>
      </ol>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
        <Link to="/signin" state={{ from: '/fantasy' }} className="btn btn--primary">
          {t('fantasy.signin')}
        </Link>
        <Link to="/fantasy/odds" className="btn btn--secondary">
          {t('fantasy.odds.link')}
        </Link>
      </div>
      <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>{t('fantasy.noMoney')}</p>
    </Page>
  );
}
