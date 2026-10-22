// All my cards: Gold first, then by rarity. Filter by rarity or Gold; turn
// duplicates into Kit Points.
import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { RARITIES, type Rarity } from '../../config/fantasy.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, EmptyState, ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { GameCard } from './GameCard.tsx';
import { RARITY_COLOR } from './model.ts';
import { useFantasy } from './useFantasy.ts';

type Filter = 'all' | 'gold' | Rarity;

export default function CardsPage() {
  const { t } = usePrefs();
  usePageMeta(t('fantasy.cards.title') + ' · Fantasy');
  const toast = useToast();
  const { user, convert, state } = useFantasy();
  const cards = useQuery({ queryKey: ['fantasyCards', user?.id], queryFn: db.loadFantasyCards, enabled: !!user, staleTime: 60_000, retry: false });
  const [filter, setFilter] = useState<Filter>('all');
  const all = cards.data ?? [];
  const shown = all.filter((c) => (filter === 'all' ? true : filter === 'gold' ? c.gold : c.rarity === filter));
  const dup = state.data?.duplicates ?? 0;
  return (
    <Page>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: 0 }}>
        {t('fantasy.cards.title')} <span className="mono" style={{ fontSize: 14, color: 'var(--muted)' }}>{all.length}</span>
      </h1>
      <div role="group" aria-label={t('fantasy.cards.byRarity')} className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 16, paddingBottom: 2 }}>
        {(['all', 'gold', ...RARITIES] as Filter[]).map((f) => (
          <button key={f} type="button" className="option-btn" aria-pressed={filter === f} onClick={() => setFilter(f)} style={{ padding: '7px 13px', fontSize: 13, flex: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {f !== 'all' && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: f === 'gold' ? '#f3c53d' : RARITY_COLOR[f] }} />}
            {f === 'all' ? t('fantasy.cards.all') : f === 'gold' ? t('fantasy.gold.badge') : t('fantasy.rarity.' + f)}
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {f === 'all' ? all.length : all.filter((c) => (f === 'gold' ? c.gold : c.rarity === f)).length}
            </span>
          </button>
        ))}
      </div>
      {dup > 0 && (
        <div className="fantasy-dup" style={{ marginTop: 14 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>{t('fantasy.dup.body', { n: dup, points: state.data?.dup_points ?? 0 })}</span>
          <Button size="sm" variant="secondary" onClick={() => convert.mutateAsync(undefined).then((p) => toast(t('fantasy.dup.converted', { points: p })))} busy={convert.isPending}>
            {t('fantasy.dup.convert')}
          </Button>
        </div>
      )}
      {cards.isLoading && <Skeleton height={320} radius={20} style={{ marginTop: 20 }} />}
      {cards.isError && <ErrorState what={t('fantasy.cards.title')} onRetry={() => cards.refetch()} />}
      {cards.data && !shown.length && (
        <div style={{ marginTop: 20 }}>
          <EmptyState title={t('fantasy.cards.empty')} action={<Link to="/fantasy" className="btn btn--primary btn--sm">{t('fantasy.open')}</Link>} />
        </div>
      )}
      {shown.length > 0 && (
        <ul className="fantasy-cardgrid" aria-label={t('fantasy.cards.title')}>
          {shown.map((c) => (
            <li key={c.kit_id}>
              <Link to={'/library/' + c.club_id + '#season-' + c.season} aria-label={`${c.club_name} ${c.season}`} style={{ display: 'block' }}>
                <GameCard c={c} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
