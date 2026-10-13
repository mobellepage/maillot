// When an order moves on by itself (run_order_lifecycle() cron job), from the
// viewer's side. The numbers live in src/config/rules.ts.
import { ORDER_POLICY } from '../../config/rules.ts';
import type { Order } from '../../utils/db.ts';

export { ORDER_POLICY };

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** key is a message with a {when} placeholder. */
export type Deadline = { at: Date; key: string };

type O = Pick<Order, 'status' | 'created_at' | 'paid_at' | 'shipped_at' | 'delivered_at' | 'inspection' | 'forwarded_at'>;

/** When the shirt left for the buyer: shipped directly, or forwarded by a centre. */
export function leftForBuyerAt(o: Pick<Order, 'inspection' | 'shipped_at' | 'forwarded_at'>): string | null {
  if (o.inspection === 'passed') return o.forwarded_at;
  if (o.inspection === 'not_required') return o.shipped_at;
  return null;
}

/** The next automatic step for an order, from the viewer's side. */
export function nextDeadline(o: O, isBuyer: boolean): Deadline | null {
  const t = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);
  if (o.status === 'pending_payment') {
    const at = new Date(t(o.created_at) + ORDER_POLICY.paymentHours * HOUR);
    return { at, key: isBuyer ? 'dl.pay.buyer' : 'dl.pay.seller' };
  }
  if (o.status === 'paid_escrow' && o.paid_at) {
    const at = new Date(t(o.paid_at) + ORDER_POLICY.shipDays * DAY);
    return { at, key: isBuyer ? 'dl.ship.buyer' : 'dl.ship.seller' };
  }
  // On its way to the buyer: without tracking it counts as delivered after
  // deliveryDays, and the release follows releaseDays later.
  const left = leftForBuyerAt(o);
  if (o.status === 'shipped' && left) {
    const at = new Date(t(left) + (ORDER_POLICY.deliveryDays + ORDER_POLICY.releaseDays) * DAY);
    return { at, key: isBuyer ? 'dl.release.buyer' : 'dl.release.seller' };
  }
  if (o.status === 'delivered' && o.delivered_at) {
    const at = new Date(t(o.delivered_at) + ORDER_POLICY.releaseDays * DAY);
    return { at, key: isBuyer ? 'dl.release.buyer' : 'dl.release.seller' };
  }
  return null;
}
