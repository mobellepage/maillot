// Where the money is, once an order is released (seller payout) or refunded
// (buyer refund). Driven by orders.payout_status, set by the settle function.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { MessageKey, Vars } from '../../i18n/index.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { Order } from '../../utils/db.ts';

type Line = [text: ReactNode, color: string];

function describe(order: Order, isBuyer: boolean, amountFmt: string, t: (k: MessageKey, v?: Vars) => string): Line | null {
  const s = order.payout_status;
  if (!isBuyer && order.status === 'released') {
    if (s === 'paid') return [t('sl.paid', { amount: amountFmt }), 'var(--accent)'];
    if (s === 'pending') return [t('sl.pending', { amount: amountFmt }), 'var(--muted)'];
    if (s === 'awaiting_onboarding')
      return [
        <>
          {t('sl.waiting', { amount: amountFmt })} <Link to="/vault">{t('sl.setup')}</Link>
        </>,
        'var(--warn)'
      ];
    if (s === 'failed') return [t('sl.failed'), 'var(--warn)'];
  }
  if (isBuyer && order.status === 'refunded') {
    if (s === 'refunded') return [t('sl.refunded'), 'var(--accent)'];
    if (s === 'refund_pending') return [t('sl.refundPending'), 'var(--muted)'];
    if (s === 'refund_failed') return [t('sl.refundFailed'), 'var(--warn)'];
  }
  return null;
}

export function SettlementLine({ order, isBuyer, amountFmt }: { order: Order; isBuyer: boolean; amountFmt: string }) {
  const { t } = usePrefs();
  const line = describe(order, isBuyer, amountFmt, t);
  if (!line) return null;
  return <div style={{ fontSize: 12.5, color: line[1], marginTop: 6 }}>{line[0]}</div>;
}
