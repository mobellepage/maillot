import { describe, expect, it } from 'vitest';
import { buildTimeline } from '../features/orders/timeline.ts';

const base = { status: 'pending_payment', created_at: '2026-10-01T10:00:00Z', paid_at: null, shipped_at: null, delivered_at: null, delivered_by: null, inspection: 'not_required', inspected_at: null, forwarded_at: null, released_at: null, updated_at: '2026-10-01T10:00:00Z', inspection_note: null };
const states = (steps) => steps.map((s) => `${s.key}:${s.state}`);

describe('buildTimeline', () => {
  it('marks the next step as current', () => {
    expect(states(buildTimeline(base, true))).toEqual(['matched:done', 'paid:current', 'shipped:upcoming', 'delivered:upcoming', 'released:upcoming']);
  });

  it('goes through the centre only when the order is routed there', () => {
    expect(states(buildTimeline({ ...base, inspection: 'pending' }, true))).toEqual(['matched:done', 'paid:current', 'shipped:upcoming', 'inspected:upcoming', 'forwarded:upcoming', 'delivered:upcoming', 'released:upcoming']);
  });

  it('notes a delivery counted automatically', () => {
    const t = buildTimeline({ ...base, status: 'delivered', paid_at: 'x', shipped_at: 'x', delivered_at: 'y', delivered_by: 'auto' }, true);
    expect(states(t)).toEqual(['matched:done', 'paid:done', 'shipped:done', 'delivered:done', 'released:current']);
    expect(t[3].detail).toBe('tl.delivered.auto');
  });

  it('walks through to release', () => {
    const o = { ...base, status: 'released', paid_at: 'x', shipped_at: 'x', delivered_at: 'x', released_at: 'x' };
    expect(buildTimeline(o, false).every((s) => s.state === 'done')).toBe(true);
  });

  it('ends early when cancelled', () => {
    expect(states(buildTimeline({ ...base, status: 'cancelled' }, true))).toEqual(['matched:done', 'cancelled:failed']);
  });

  it('shows a failed inspection and the refund', () => {
    const o = { ...base, status: 'refunded', paid_at: 'x', shipped_at: 'x', inspection: 'failed', inspected_at: 'y', inspection_note: 'crest' };
    const t = buildTimeline(o, false);
    expect(states(t)).toEqual(['matched:done', 'paid:done', 'shipped:done', 'inspected:failed', 'refunded:failed']);
    expect(t[3]).toMatchObject({ detail: 'tl.failed.reason', detailVars: { reason: 'crest' } });
  });

  it('explains an unshipped refund', () => {
    const t = buildTimeline({ ...base, status: 'refunded', paid_at: 'x' }, true);
    expect(states(t)).toEqual(['matched:done', 'paid:done', 'refunded:failed']);
    expect(t[2].detail).toBe('tl.refunded.unshipped');
  });

  it('inserts an open dispute where the order stopped', () => {
    const o = { ...base, status: 'disputed', paid_at: 'x', shipped_at: 'x' };
    expect(states(buildTimeline(o, true, { created_at: 'z', reason: 'Not as described' }))).toEqual([
      'matched:done',
      'paid:done',
      'shipped:done',
      'dispute:current',
      'delivered:upcoming',
      'released:upcoming'
    ]);
  });
});
