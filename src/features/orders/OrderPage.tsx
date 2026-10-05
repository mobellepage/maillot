// /orders/:id — one order end to end: where it is, what happened when, what
// the money is doing, and what the viewer can do next.
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { SELLER_FEE_RATE } from '../../fees.ts';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import type { OrderStatus } from '../../types/domain.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { Badge, Card, ErrorState, KeyValueList, Page, ShirtGraphic, Skeleton } from '../../ui/index.ts';
import { DeadlineLine } from './DeadlineLine.tsx';
import { OrderActions } from './OrderActions.tsx';
import { SettlementLine } from './SettlementLine.tsx';
import { ShipmentLine } from './ShipmentLine.tsx';
import { ORDER_TONE } from './status.ts';
import { buildTimeline, type StepState } from './timeline.ts';
import { useMyCertificates, useOrders } from './useOrders.ts';

const DOT: Record<StepState, { bg: string; border: string }> = {
  done: { bg: 'var(--accent)', border: 'var(--accent)' },
  current: { bg: 'var(--bg)', border: 'var(--accent)' },
  upcoming: { bg: 'var(--bg)', border: 'var(--line-strong)' },
  failed: { bg: 'var(--neg)', border: 'var(--neg)' }
};

export default function OrderPage() {
  useCatalog();
  const { id = '' } = useParams();
  const { user } = useSession();
  const { t, money, lang } = usePrefs();
  const orders = useOrders();
  const [now] = useState(Date.now);
  const o = orders.data?.find((x) => x.id === id);
  const isBuyer = o?.buyer_id === user?.id;
  const certs = useMyCertificates(!!o && isBuyer && o.inspection === 'passed');
  const disputes = useQuery({ queryKey: ['disputes', id], enabled: !!o && (o.status === 'disputed' || o.status === 'refunded' || o.status === 'released'), queryFn: () => db.loadDisputesForOrder(id) });
  const shirt = o?.shirt_id ? BY[o.shirt_id] : undefined;
  usePageMeta(shirt ? `Order · ${shirt.name}` : 'Order');

  if (orders.isLoading)
    return (
      <Page narrow>
        <Skeleton height={420} radius={20} />
      </Page>
    );
  if (orders.isError)
    return (
      <Page narrow>
        <ErrorState what="this order" onRetry={() => orders.refetch()} />
      </Page>
    );
  if (!o) return <Navigate to="/orders" replace />;

  const dispute = disputes.data?.[0] ?? null;
  const steps = buildTimeline(o, isBuyer, dispute);
  const status = o.status as OrderStatus;
  const certificate = isBuyer ? certs.data?.[o.id] : undefined;
  const breakdown: [ReactNode, ReactNode][] = isBuyer
    ? [
        ['Shirt', money(Number(o.amount))],
        ['Authentication', money(Number(o.auth_fee))],
        ['Insured shipping', money(Number(o.shipping_fee))],
        ['Total', <strong key="t">{money(db.orderTotal(o))}</strong>]
      ]
    : [
        ['Sale price', money(Number(o.amount))],
        [`Seller fee (${Math.round(SELLER_FEE_RATE * 100)}%)`, '− ' + money(Number(o.commission))],
        ['Your payout', <strong key="p">{money(Number(o.amount) - Number(o.commission))}</strong>]
      ];

  return (
    <Page narrow>
      <Link to="/orders" className="btn btn--ghost btn--sm" style={{ marginBottom: 20 }}>
        ← All orders
      </Link>
      <Card style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 96, flex: 'none' }}>{shirt && <ShirtGraphic pat={shirt.pat} trim={shirt.trim} crest={shirt.crest} flat />}</div>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge>{isBuyer ? t('order.role.buy') : t('order.role.sell')}</Badge>
            <Badge tone={ORDER_TONE[status] ?? 'neutral'}>{t('order.' + status)}</Badge>
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(22px,3vw,30px)', margin: '10px 0 0' }}>
            {shirt ? <Link to={'/shirt/' + shirt.id} style={{ color: 'var(--text)' }}>{shirt.name}</Link> : o.shirt_id}
          </h1>
          <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            Size {o.size} · Order {o.id.slice(0, 8).toUpperCase()}
          </div>
          <ShipmentLine order={o} isBuyer={isBuyer} certificate={certificate} />
          <SettlementLine order={o} isBuyer={isBuyer} amountFmt={money(Number(o.amount) - Number(o.commission))} />
          <DeadlineLine order={o} isBuyer={isBuyer} lang={lang} now={now} />
          <div style={{ marginTop: 14 }}>
            <OrderActions order={o} isBuyer={isBuyer} />
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 16, alignItems: 'start' }}>
        <Card>
          <h2 className="title" style={{ margin: '0 0 16px' }}>
            Timeline
          </h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {steps.map((s, i) => (
              <li key={s.key} aria-current={s.state === 'current' ? 'step' : undefined} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 12, position: 'relative', paddingBottom: i === steps.length - 1 ? 0 : 18 }}>
                {i < steps.length - 1 && <span aria-hidden="true" style={{ position: 'absolute', left: 8, top: 16, bottom: 0, width: 2, background: s.state === 'done' ? 'var(--accent-line)' : 'var(--line)' }} />}
                <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 9, marginTop: 1, background: DOT[s.state].bg, border: `2px solid ${DOT[s.state].border}`, boxShadow: s.state === 'current' ? '0 0 0 4px var(--accent-soft)' : undefined }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5, color: s.state === 'upcoming' ? 'var(--muted)' : s.state === 'failed' ? 'var(--neg)' : 'var(--text)' }}>
                    {s.title}
                    <span className="sr-only">{s.state === 'done' ? ' (done)' : s.state === 'current' ? ' (current step)' : s.state === 'failed' ? '' : ' (not yet)'}</span>
                  </div>
                  {s.at && s.state !== 'upcoming' && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{formatDate(s.at, lang, true)}</div>}
                  {s.detail && s.state !== 'upcoming' && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>{s.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2 className="title" style={{ margin: '0 0 12px' }}>
            {isBuyer ? 'What you pay' : 'What you get'}
          </h2>
          <KeyValueList rows={breakdown} />
          <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, margin: '14px 0 0' }}>
            {isBuyer ? 'Held in escrow until you confirm delivery or the confirmation window ends.' : 'Paid to your bank via Stripe once the buyer confirms delivery.'}{' '}
            <Link to="/authentication">How it works</Link>
          </p>
        </Card>
      </div>
    </Page>
  );
}
