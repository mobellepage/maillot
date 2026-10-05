// Order deadlines enforced by the run_order_lifecycle() cron job. Mirrors
// public.order_policy() — supabase/tests/database/03_lifecycle.test.sql fails
// if the two drift apart.
import type { Order } from '../../utils/db.ts';

export const ORDER_POLICY = { paymentHours: 24, shipDays: 5, releaseDays: 14 } as const;

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export type Deadline = { at: Date; text: (when: string) => string };

/** The next automatic step for an order, from the viewer's side. */
export function nextDeadline(o: Pick<Order, 'status' | 'created_at' | 'paid_at' | 'inspection' | 'forwarded_at'>, isBuyer: boolean): Deadline | null {
  const t = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);
  if (o.status === 'pending_payment') {
    const at = new Date(t(o.created_at) + ORDER_POLICY.paymentHours * HOUR);
    return { at, text: (w) => (isBuyer ? `Pay by ${w} or the order is cancelled` : `Buyer has until ${w} to pay`) };
  }
  if (o.status === 'paid_escrow' && o.paid_at) {
    const at = new Date(t(o.paid_at) + ORDER_POLICY.shipDays * DAY);
    return { at, text: (w) => (isBuyer ? `Seller ships by ${w}, or you’re refunded automatically` : `Ship by ${w} — otherwise the buyer is refunded`) };
  }
  // While the shirt is at the authentication centre nothing is on a clock.
  if (o.status === 'shipped' && o.inspection === 'passed' && o.forwarded_at) {
    const at = new Date(t(o.forwarded_at) + ORDER_POLICY.releaseDays * DAY);
    return { at, text: (w) => (isBuyer ? `Confirm or report a problem by ${w}` : `Payment releases automatically on ${w}`) };
  }
  return null;
}
