import { describe, expect, it } from 'vitest';
import { ORDER_POLICY, nextDeadline } from '../features/orders/policy.ts';

const base = { created_at: '2026-10-01T10:00:00Z', paid_at: null, inspection: 'pending', forwarded_at: null };

describe('nextDeadline', () => {
  it('gives the buyer the payment window', () => {
    const d = nextDeadline({ ...base, status: 'pending_payment' }, true);
    expect(d.at.toISOString()).toBe(new Date(Date.parse(base.created_at) + ORDER_POLICY.paymentHours * 3600_000).toISOString());
    expect(d.text('X')).toMatch(/^Pay by X/);
  });
  it('tells the seller when to ship', () => {
    const d = nextDeadline({ ...base, status: 'paid_escrow', paid_at: '2026-10-02T00:00:00Z' }, false);
    expect(d.at.toISOString()).toBe('2026-10-07T00:00:00.000Z');
    expect(d.text('X')).toMatch(/^Ship by X/);
  });
  it('starts the release clock when the centre forwards the shirt', () => {
    expect(nextDeadline({ ...base, status: 'shipped' }, false)).toBeNull();
    const d = nextDeadline({ ...base, status: 'shipped', inspection: 'passed', forwarded_at: '2026-10-02T00:00:00Z' }, false);
    expect(d.at.toISOString()).toBe('2026-10-16T00:00:00.000Z');
  });
  it('has nothing pending for finished or disputed orders', () => {
    for (const status of ['released', 'refunded', 'cancelled', 'disputed']) expect(nextDeadline({ ...base, status }, true)).toBeNull();
  });
});
