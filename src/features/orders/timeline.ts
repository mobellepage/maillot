// An order's history and next steps as a list for the order page. Derived
// only from the order's timestamps and status, so it can't drift from what
// the server recorded.
import type { Order } from '../../utils/db.ts';

export type StepState = 'done' | 'current' | 'upcoming' | 'failed';
/** title and detail are message keys; detailVars fill the detail's placeholders. */
export type Step = { key: string; title: string; detail?: string; detailVars?: Record<string, string>; at: string | null; state: StepState };

type O = Pick<Order, 'status' | 'created_at' | 'paid_at' | 'shipped_at' | 'inspection' | 'inspected_at' | 'forwarded_at' | 'released_at' | 'updated_at' | 'inspection_note'>;

export function buildTimeline(o: O, isBuyer: boolean, dispute?: { created_at: string; reason: string | null; resolved_at?: string | null } | null): Step[] {
  const failedInspection = o.inspection === 'failed';
  const steps: Step[] = [
    { key: 'matched', title: 'tl.matched', detail: isBuyer ? 'tl.matched.buyer' : 'tl.matched.seller', at: o.created_at, state: 'done' },
    { key: 'paid', title: 'tl.paid', detail: isBuyer ? 'tl.paid.buyer' : 'tl.paid.seller', at: o.paid_at, state: o.paid_at ? 'done' : 'upcoming' },
    { key: 'shipped', title: 'tl.shipped', detail: isBuyer ? 'tl.shipped.buyer' : 'tl.shipped.seller', at: o.shipped_at, state: o.shipped_at ? 'done' : 'upcoming' },
    {
      key: 'inspected',
      title: failedInspection ? 'tl.failed' : 'tl.authenticated',
      detail: failedInspection ? (o.inspection_note ? 'tl.failed.reason' : undefined) : 'tl.authenticated.detail',
      detailVars: o.inspection_note ? { reason: o.inspection_note } : undefined,
      at: o.inspected_at,
      state: failedInspection ? 'failed' : o.inspection === 'passed' ? 'done' : 'upcoming'
    },
    { key: 'forwarded', title: isBuyer ? 'tl.forwarded.buyer' : 'tl.forwarded.seller', at: o.forwarded_at, state: o.forwarded_at ? 'done' : 'upcoming' },
    { key: 'released', title: isBuyer ? 'tl.released.buyer' : 'tl.released.seller', at: o.released_at, state: o.status === 'released' ? 'done' : 'upcoming' }
  ];

  // Terminal side branches replace the steps that will now never happen.
  const cut = (afterKey: string, step: Step) => {
    const i = steps.findIndex((s) => s.key === afterKey);
    steps.splice(i + 1, steps.length, step);
  };
  if (o.status === 'cancelled') cut('matched', { key: 'cancelled', title: o.paid_at ? 'tl.cancelled' : 'tl.cancelledUnpaid', detail: 'tl.cancelled.detail', at: o.updated_at, state: 'failed' });
  if (o.status === 'refunded' && !failedInspection) {
    const last = o.shipped_at ? 'shipped' : 'paid';
    cut(last, { key: 'refunded', title: 'tl.refunded', detail: dispute ? 'tl.refunded.dispute' : o.shipped_at ? undefined : 'tl.refunded.unshipped', at: o.updated_at, state: 'failed' });
  }
  if (failedInspection) cut('inspected', { key: 'refunded', title: 'tl.refunded', detail: isBuyer ? undefined : 'tl.refunded.returned', at: o.inspected_at, state: 'failed' });

  if (dispute) {
    const at = steps.findIndex((s) => s.state !== 'done');
    const d: Step = { key: 'dispute', title: 'tl.dispute', detail: dispute.reason ? 'tl.dispute.reason' : undefined, detailVars: dispute.reason ? { reason: dispute.reason } : undefined, at: dispute.created_at, state: o.status === 'disputed' ? 'current' : 'done' };
    steps.splice(at < 0 ? steps.length : at, 0, d);
  }

  // The first step that hasn't happened yet is where the order is now.
  if (!['cancelled', 'refunded', 'released', 'disputed'].includes(o.status)) {
    const next = steps.find((s) => s.state === 'upcoming');
    if (next) next.state = 'current';
  }
  return steps;
}
