// An order's history and next steps as a list for the order page. Derived
// only from the order's timestamps and status, so it can't drift from what
// the server recorded.
import type { Order } from '../../utils/db.ts';

export type StepState = 'done' | 'current' | 'upcoming' | 'failed';
export type Step = { key: string; title: string; detail?: string; at: string | null; state: StepState };

type O = Pick<Order, 'status' | 'created_at' | 'paid_at' | 'shipped_at' | 'inspection' | 'inspected_at' | 'forwarded_at' | 'released_at' | 'updated_at' | 'inspection_note'>;

export function buildTimeline(o: O, isBuyer: boolean, dispute?: { created_at: string; reason: string | null; resolved_at?: string | null } | null): Step[] {
  const failedInspection = o.inspection === 'failed';
  const steps: Step[] = [
    { key: 'matched', title: 'Matched', detail: isBuyer ? 'Your bid met an ask.' : 'A buyer met your ask.', at: o.created_at, state: 'done' },
    { key: 'paid', title: 'Paid into escrow', detail: isBuyer ? 'Held by Maillot until you confirm delivery.' : 'The buyer paid; the money is held for you.', at: o.paid_at, state: o.paid_at ? 'done' : 'upcoming' },
    { key: 'shipped', title: 'Shipped to Zürich', detail: isBuyer ? 'The seller sent it to our authentication centre.' : 'You sent it to our authentication centre.', at: o.shipped_at, state: o.shipped_at ? 'done' : 'upcoming' },
    {
      key: 'inspected',
      title: failedInspection ? 'Failed authentication' : 'Authenticated',
      detail: failedInspection ? (o.inspection_note ? `Reason: ${o.inspection_note}` : undefined) : '14-point inspection passed; certificate issued.',
      at: o.inspected_at,
      state: failedInspection ? 'failed' : o.inspection === 'passed' ? 'done' : 'upcoming'
    },
    { key: 'forwarded', title: isBuyer ? 'On its way to you' : 'Forwarded to the buyer', at: o.forwarded_at, state: o.forwarded_at ? 'done' : 'upcoming' },
    { key: 'released', title: isBuyer ? 'Delivered — payment released' : 'Payment released to you', at: o.released_at, state: o.status === 'released' ? 'done' : 'upcoming' }
  ];

  // Terminal side branches replace the steps that will now never happen.
  const cut = (afterKey: string, step: Step) => {
    const i = steps.findIndex((s) => s.key === afterKey);
    steps.splice(i + 1, steps.length, step);
  };
  if (o.status === 'cancelled') cut('matched', { key: 'cancelled', title: o.paid_at ? 'Cancelled' : 'Cancelled before payment', detail: 'Nobody was charged.', at: o.updated_at, state: 'failed' });
  if (o.status === 'refunded' && !failedInspection) {
    const last = o.shipped_at ? 'shipped' : 'paid';
    cut(last, { key: 'refunded', title: 'Refunded to the buyer', detail: dispute ? 'After a dispute.' : o.shipped_at ? undefined : 'The seller didn’t ship in time.', at: o.updated_at, state: 'failed' });
  }
  if (failedInspection) cut('inspected', { key: 'refunded', title: 'Refunded to the buyer', detail: isBuyer ? undefined : 'The shirt is being returned to you.', at: o.inspected_at, state: 'failed' });

  if (dispute) {
    const at = steps.findIndex((s) => s.state !== 'done');
    const d: Step = { key: 'dispute', title: 'Dispute opened', detail: dispute.reason ?? undefined, at: dispute.created_at, state: o.status === 'disputed' ? 'current' : 'done' };
    steps.splice(at < 0 ? steps.length : at, 0, d);
  }

  // The first step that hasn't happened yet is where the order is now.
  if (!['cancelled', 'refunded', 'released', 'disputed'].includes(o.status)) {
    const next = steps.find((s) => s.state === 'upcoming');
    if (next) next.state = 'current';
  }
  return steps;
}
