import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { OrderStatus } from '../../types/domain.ts';
import type { Order } from '../../utils/db.ts';
import { Badge, Button, EmptyState, ButtonLink, Skeleton } from '../../ui/index.ts';
import { DisputeDialog, ReleaseDialog, ShipDialog } from './OrderDialogs.tsx';
import { ORDER_TONE } from './status.ts';
import { useOrderActions, useOrders } from './useOrders.ts';

type Open = { kind: 'ship' | 'release' | 'dispute'; order: Order } | null;

export function OrdersTab() {
  const { user } = useSession();
  const { t, money, lang } = usePrefs();
  const toast = useToast();
  const orders = useOrders();
  const act = useOrderActions();
  const [open, setOpen] = useState<Open>(null);
  const [params, setParams] = useSearchParams();

  // Returning from Stripe Checkout: confirm once, then drop the query.
  useEffect(() => {
    const outcome = params.get('checkout');
    if (!outcome) return;
    toast(outcome === 'success' ? 'Payment received — it’s held in escrow until you confirm delivery.' : 'Payment cancelled.');
    setParams({}, { replace: true });
  }, [params, setParams, toast]);

  const close = () => setOpen(null);
  const total = (o: Order) => Number(o.amount) + Number(o.auth_fee || 0) + Number(o.shipping_fee || 0);

  if (orders.isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        {[0, 1].map((i) => (
          <Skeleton key={i} height={84} radius={18} />
        ))}
      </div>
    );
  }
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
                  {o.tracking_code ? ' · Tracking: ' + o.tracking_code : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                  {money(isBuyer ? total(o) : Number(o.amount))}
                </div>
                <Badge tone={ORDER_TONE[status] ?? 'neutral'} style={{ fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                  {t('order.' + status)}
                </Badge>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isBuyer && status === 'pending_payment' && (
                    <>
                      <Button size="sm" busy={act.pay.isPending && act.pay.variables === o.id} busyLabel="Opening…" onClick={() => act.pay.mutate(o.id)}>
                        {t('order.action.payNow')}
                      </Button>
                      <Button size="sm" variant="danger" busy={act.cancel.isPending && act.cancel.variables === o.id} onClick={() => act.cancel.mutate(o.id)}>
                        {t('order.action.cancel')}
                      </Button>
                    </>
                  )}
                  {!isBuyer && status === 'paid_escrow' && (
                    <Button size="sm" onClick={() => setOpen({ kind: 'ship', order: o })}>
                      {t('order.action.markShipped')}
                    </Button>
                  )}
                  {isBuyer && status === 'shipped' && (
                    <Button size="sm" onClick={() => setOpen({ kind: 'release', order: o })}>
                      {t('order.action.confirmRelease')}
                    </Button>
                  )}
                  {(status === 'paid_escrow' || status === 'shipped') && (
                    <Button size="sm" variant="ghost" onClick={() => setOpen({ kind: 'dispute', order: o })}>
                      {t('order.action.dispute')}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ShipDialog key={'s' + open?.order.id} open={open?.kind === 'ship'} onClose={close} busy={act.ship.isPending} onSubmit={(tracking) => open && act.ship.mutate({ id: open.order.id, tracking }, { onSuccess: close })} />
      <ReleaseDialog open={open?.kind === 'release'} onClose={close} busy={act.release.isPending} amountFmt={open ? money(Number(open.order.amount)) : ''} onConfirm={() => open && act.release.mutate(open.order.id, { onSuccess: close })} />
      <DisputeDialog key={'d' + open?.order.id} open={open?.kind === 'dispute'} onClose={close} busy={act.dispute.isPending} onSubmit={(reason) => open && act.dispute.mutate({ id: open.order.id, reason }, { onSuccess: close })} />
    </>
  );
}
