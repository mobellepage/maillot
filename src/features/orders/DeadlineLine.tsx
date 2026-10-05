import { formatDate } from '../../lib/format.ts';
import type { Order } from '../../utils/db.ts';
import { nextDeadline } from './policy.ts';

/** The next automatic step for the order; amber when it's under 48 h away. */
export function DeadlineLine({ order, isBuyer, lang, now }: { order: Order; isBuyer: boolean; lang: string; now: number }) {
  const d = nextDeadline(order, isBuyer);
  if (!d || Number.isNaN(d.at.getTime())) return null;
  const soon = d.at.getTime() - now < 48 * 3600_000;
  return (
    <div style={{ fontSize: 12.5, marginTop: 6, color: soon ? 'var(--warn)' : 'var(--text-2)' }}>
      {d.text(formatDate(d.at.toISOString(), lang, true))}
    </div>
  );
}
