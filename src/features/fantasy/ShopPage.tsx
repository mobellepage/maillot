// The weekly shop: six kits a week (four common, two rare), the same for
// everyone, bought with Kit Points — one of each per week.
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { GameCard } from './GameCard.tsx';
import { useFantasy } from './useFantasy.ts';

export default function ShopPage() {
  const { t, lang } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { state, refresh } = useFantasy();
  usePageMeta(t('fantasy.shop.title') + ' · Fantasy', t('fantasy.shop.body'));
  const shop = useQuery({ queryKey: ['fantasyShop', user?.id], queryFn: db.loadFantasyShop, staleTime: 60_000, retry: false });
  const buy = useMutation({
    mutationFn: (kitId: string) => db.buyFantasyCard(kitId),
    onSuccess: (price) => {
      toast(t('fantasy.shop.bought', { price }));
      void qc.invalidateQueries({ queryKey: ['fantasyShop', user?.id] });
      refresh();
    },
    onError: (e) => {
      const code = (e as { code?: string }).code;
      toast(code === 'P0461' ? t('fantasy.err.points') : code === 'P0464' ? t('fantasy.shop.already') : t('fantasy.err.failed'));
    }
  });
  const ends = shop.data?.[0]?.week_ends ? new Date(shop.data[0].week_ends + 'T00:00:00').toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const points = state.data?.points ?? 0;
  return (
    <Page>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      <div className="fantasy-head">
        <div>
          <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: 0 }}>
            {t('fantasy.shop.title')}
          </h1>
          <p style={{ color: 'var(--text-2)', marginTop: 8, maxWidth: 620, lineHeight: 1.5 }}>
            {t('fantasy.shop.body')} {ends && t('fantasy.shop.until', { date: ends })}
          </p>
        </div>
        {user && (
          <span className="fantasy-stat">
            <b>{points.toLocaleString('de-CH')}</b>
            <small>{t('fantasy.pointsLabel')}</small>
          </span>
        )}
      </div>
      {shop.isLoading && <Skeleton height={320} radius={20} style={{ marginTop: 20 }} />}
      {shop.isError && <ErrorState what={t('fantasy.shop.title')} onRetry={() => shop.refetch()} />}
      {shop.data && (
        <ul className="fantasy-shop">
          {shop.data.map((k) => (
            <li key={k.kit_id} className="card fantasy-shopitem">
              <GameCard c={k} />
              <div className="fantasy-shopitem__row">
                <span className="mono" style={{ fontWeight: 700 }}>
                  {k.price} KP
                </span>
                {user ? (
                  <Button size="sm" variant={k.bought ? 'secondary' : 'primary'} disabled={k.bought || points < k.price} busy={buy.isPending && buy.variables === k.kit_id} onClick={() => buy.mutate(k.kit_id)}>
                    {k.bought ? t('fantasy.shop.boughtLabel') : t('fantasy.shop.buy')}
                  </Button>
                ) : (
                  <Link to="/signin" state={{ from: '/fantasy/shop' }} className="btn btn--primary btn--sm">
                    {t('fantasy.signin')}
                  </Link>
                )}
              </div>
              {k.owned && !k.bought && <span className="fantasy-shopitem__note">{t('fantasy.shop.owned')}</span>}
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
