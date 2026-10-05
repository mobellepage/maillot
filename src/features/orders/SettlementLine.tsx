// Where the money is, once an order is released (seller payout) or refunded
// (buyer refund). Driven by orders.payout_status, set by the settle function.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Order } from '../../utils/db.ts';

type Line = [text: ReactNode, color: string];

function describe(order: Order, isBuyer: boolean, amountFmt: string): Line | null {
  const s = order.payout_status;
  if (!isBuyer && order.status === 'released') {
    if (s === 'paid') return [`Paid out ${amountFmt}`, 'var(--accent)'];
    if (s === 'pending') return [`Payout of ${amountFmt} processing`, 'var(--muted)'];
    if (s === 'awaiting_onboarding')
      return [
        <>
          {amountFmt} waiting for you — <Link to="/vault">set up payouts</Link>
        </>,
        'var(--warn)'
      ];
    if (s === 'failed') return ['Payout delayed — our team has been notified', 'var(--warn)'];
  }
  if (isBuyer && order.status === 'refunded') {
    if (s === 'refunded') return ['Refunded to your original payment method', 'var(--accent)'];
    if (s === 'refund_pending') return ['Refund processing', 'var(--muted)'];
    if (s === 'refund_failed') return ['Refund delayed — our team has been notified', 'var(--warn)'];
  }
  return null;
}

export function SettlementLine({ order, isBuyer, amountFmt }: { order: Order; isBuyer: boolean; amountFmt: string }) {
  const line = describe(order, isBuyer, amountFmt);
  if (!line) return null;
  return <div style={{ fontSize: 12.5, color: line[1], marginTop: 6 }}>{line[0]}</div>;
}
