import { describe, expect, it } from 'vitest';
import { ORDER_POLICY, nextDeadline } from '../features/orders/policy.ts';

const base = { created_at: '2026-10-01T10:00:00Z', paid_at: null, shipped_at: null, delivered_at: null, inspection: 'not_required', forwarded_at: null };

describe('nextDeadline', () => {
  it('gives the buyer the payment window', () => {
    const d = nextDeadline({ ...base, status: 'pending_payment' }, true);
    expect(d.at.toISOString()).toBe(new Date(Date.parse(base.created_at) + ORDER_POLICY.paymentHours * 3600_000).toISOString());
    expect(d.key).toBe('dl.pay.buyer');
  });
  it('tells the seller when to ship', () => {
    const d = nextDeadline({ ...base, status: 'paid_escrow', paid_at: '2026-10-02T00:00:00Z' }, false);
    expect(d.at.toISOString()).toBe('2026-10-07T00:00:00.000Z');
    expect(d.key).toBe('dl.ship.seller');
  });
  it('releases deliveryDays + releaseDays after a direct shipment', () => {
    const d = nextDeadline({ ...base, status: 'shipped', shipped_at: '2026-10-02T00:00:00Z' }, false);
    expect(d.at.toISOString()).toBe('2026-10-14T00:00:00.000Z');
    expect(d.key).toBe('dl.release.seller');
  });
  it('releases releaseDays after delivery', () => {
    const d = nextDeadline({ ...base, status: 'delivered', shipped_at: '2026-10-02T00:00:00Z', delivered_at: '2026-10-04T00:00:00Z' }, true);
    expect(d.at.toISOString()).toBe('2026-10-09T00:00:00.000Z');
    expect(d.key).toBe('dl.release.buyer');
  });
  it('stops the clock while a centre inspects the shirt', () => {
    expect(nextDeadline({ ...base, status: 'shipped', inspection: 'pending', shipped_at: '2026-10-02T00:00:00Z' }, false)).toBeNull();
    const d = nextDeadline({ ...base, status: 'shipped', inspection: 'passed', forwarded_at: '2026-10-02T00:00:00Z' }, false);
    expect(d.at.toISOString()).toBe('2026-10-14T00:00:00.000Z');
  });
  it('has nothing pending for finished or disputed orders', () => {
    for (const status of ['released', 'refunded', 'cancelled', 'disputed']) expect(nextDeadline({ ...base, status }, true)).toBeNull();
  });
});
