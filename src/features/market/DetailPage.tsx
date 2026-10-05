import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCatalog } from '../catalog/useCatalog.ts';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { Page, SectionHeader } from '../../ui/index.ts';
import { getShirt, marketValue, related, resolveSize } from '../catalog/model.ts';
import { ShirtGrid } from '../catalog/ShirtGrid.tsx';
import { useWatchlist } from '../watchlist/useWatchlist.ts';
import { BidBuyDialog } from './detail/BidBuyDialog.tsx';
import { Gallery } from './detail/Gallery.tsx';
import { InfoCards } from './detail/InfoCards.tsx';
import { PriceHistory } from './detail/PriceHistory.tsx';
import { PricePanel } from './detail/PricePanel.tsx';
import { useOrderBook, useShirtStats } from './queries.ts';

export default function DetailPage() {
  useCatalog(); // re-render when the live catalogue loads
  const { id } = useParams();
  const s = getShirt(id);
  const [params, setParams] = useSearchParams();
  const { user } = useSession();
  const watch = useWatchlist();
  const [dialog, setDialog] = useState<'buy' | 'bid' | null>(null);
  const size = s ? resolveSize(s, params.get('size')) : 'M';
  const bookQuery = useOrderBook(s?.id, size);
  const book = bookQuery.data ?? { bids: [], asks: [] };
  const stats = useShirtStats(s?.id).data;
  const askSellers = [...new Set(book.asks.map((a) => a.user_id).filter((x): x is string => !!x))];
  const sellers = useQuery({ queryKey: ['sellerCards', askSellers.join(',')], enabled: askSellers.length > 0, queryFn: () => db.loadSellerCards(askSellers), staleTime: 60_000 }).data ?? {};
  const { t, label } = usePrefs();
  usePageMeta(s ? t('detail.metaTitle', { name: s.name }) : null, s ? t('detail.metaDesc', { name: s.name, brand: s.brand }) : undefined);

  useEffect(() => {
    if (s) db.logEvent(user?.id ?? null, s.id, 'view').catch(() => {});
  }, [s, user?.id]);

  if (!s) return <Navigate to="/market" replace />;

  const liveAsk = book.asks.find((a) => a.user_id !== user?.id);
  return (
    <Page style={{ paddingTop: 24 }}>
      <nav aria-label={t('detail.breadcrumb')} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', marginBottom: 22, flexWrap: 'wrap' }}>
        <Link to="/market" className="nav-link" style={{ padding: 0 }}>
          {t('detail.back')}
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={'/market?league=' + encodeURIComponent(s.league)} className="nav-link" style={{ padding: 0 }}>
          {label('league', s.league)}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" style={{ color: 'var(--text-2)' }}>
          {s.club}
        </span>
      </nav>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,56px)', alignItems: 'flex-start' }}>
        <Gallery s={s} />
        <PricePanel
          s={s}
          size={size}
          setSize={(z) => setParams((p) => (p.set('size', z), p), { replace: true })}
          book={book}
          myUserId={user?.id}
          stats={stats}
          watched={watch.has(s.id)}
          toggleWatch={() => watch.toggle(s.id)}
          openBuy={() => setDialog('buy')}
          openBid={() => setDialog('bid')}
          sellers={sellers}
          bookError={bookQuery.isError}
          retryBook={() => bookQuery.refetch()}
        />
      </div>

      <PriceHistory key={s.id} s={s} />
      <InfoCards s={s} stats={stats} watched={watch.has(s.id)} toggleWatch={() => watch.toggle(s.id)} />

      <section aria-labelledby="related-title" style={{ marginTop: 'clamp(48px,6vw,80px)' }}>
        <SectionHeader id="related-title" title={t('detail.related')} size="sm" />
        <ShirtGrid shirts={related(s)} />
      </section>

      <BidBuyDialog
        key={dialog ?? 'closed'}
        mode={dialog}
        onClose={() => setDialog(null)}
        shirt={s}
        size={size}
        lowestAsk={liveAsk ? Number(liveAsk.amount) : null}
        topBid={book.bids[0] ? Number(book.bids[0].amount) : null}
        marketValue={marketValue(s, size)}
      />
    </Page>
  );
}
