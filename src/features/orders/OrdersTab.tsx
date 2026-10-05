import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { OrderStatus } from '../../types/domain.ts';
import { orderTotal } from '../../utils/db.ts';
import { Badge, EmptyState, ErrorState, ButtonLink, Skeleton } from '../../ui/index.ts';
import { DeadlineLine } from './DeadlineLine.tsx';
import { OrderActions } from './OrderActions.tsx';
import { ORDER_TONE } from './status.ts';
import { SettlementLine } from './SettlementLine.tsx';
import { ShipmentLine } from './ShipmentLine.tsx';
import { useMyCertificates, useOrders } from './useOrders.ts';

export function OrdersTab() {
  const { user } = useSession();
  const { t, money, lang } = usePrefs();
  const toast = useToast();
  const orders = useOrders();
  const certs = useMyCertificates((orders.data ?? []).some((o) => o.inspection === 'passed'));
  const [now] = useState(Date.now);
  const [params, setParams] = useSearchParams();

  // Returning from Stripe Checkout: confirm once, then drop the query.
  useEffect(() => {
    const outcome = params.get('checkout');
    if (!outcome) return;
    toast(outcome === 'success' ? 'Payment received — it’s held in escrow until you confirm delivery.' : 'Payment cancelled.');
    setParams({}, { replace: true });
  }, [params, setParams, toast]);


  if (orders.isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        {[0, 1].map((i) => (
          <Skeleton key={i} height={84} radius={18} />
        ))}
      </div>
    );
  }
  if (orders.isError)
    return (
      <div style={{ marginTop: 24 }}>
        <ErrorState what={t('what.orders')} onRetry={() => orders.refetch()} />
      </div>
    );
  const list = orders.data ?? [];
  if (!list.length) {
    return (
      <div style={{ marginTop: 24 }}>
        <EmptyState title="No orders yet" action={<ButtonLink to="/market" size="sm">Browse the market</ButtonLink>}>
          Buy or sell a shirt and it shows up here, with every step from payment to delivery.
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12, margin: '24px 0 0' }}>
        {list.map((o) => {
          const isBuyer = o.buyer_id === user?.id;
          const status = o.status as OrderStatus;
          const shirt = o.shirt_id ? BY[o.shirt_id] : undefined;
          return (
            <li key={o.id} className="card" style={{ padding: 18, borderRadius: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
              <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge>{isBuyer ? t('order.role.buy') : t('order.role.sell')}</Badge>
                  {shirt ? (
                    <Link to={'/shirt/' + shirt.id} style={{ color: 'var(--text)', fontSize: 14.5, fontWeight: 600 }}>
                      {shirt.name}
                    </Link>
                  ) : (
                    <span style={{ fontSize: 14.5, fontWeight: 600 }}>{o.shirt_id}</span>
                  )}
                  <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Size {o.size}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  {formatDate(o.created_at, lang)}
                </div>
                <ShipmentLine order={o} isBuyer={isBuyer} certificate={isBuyer ? certs.data?.[o.id] : undefined} />
                <SettlementLine order={o} isBuyer={isBuyer} amountFmt={money(Number(o.amount) - Number(o.commission))} />
                <DeadlineLine order={o} isBuyer={isBuyer} lang={lang} now={now} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                  {money(isBuyer ? orderTotal(o) : Number(o.amount))}
                </div>
                <Badge tone={ORDER_TONE[status] ?? 'neutral'} style={{ fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                  {t('order.' + status)}
                </Badge>
                <OrderActions order={o} isBuyer={isBuyer} />
                <Link to={'/orders/' + o.id} className="btn btn--ghost btn--sm">
                  Details
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
