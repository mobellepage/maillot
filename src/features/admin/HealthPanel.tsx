// Operations at a glance: browser errors, money that didn't move, work
// waiting on the team. The same checks alert admins every 15 minutes
// (run_health_check) — this is where they land.
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { Card, ErrorState, SectionHeader, StatTile } from '../../ui/index.ts';

export function HealthPanel() {
  const { isAdmin } = useSession();
  const { lang } = usePrefs();
  const health = useQuery({ queryKey: ['adminHealth'], enabled: isAdmin, queryFn: db.loadHealth, refetchInterval: 60_000 });
  const errors = useQuery({ queryKey: ['adminErrors'], enabled: isAdmin, queryFn: db.loadRecentErrors, refetchInterval: 60_000 });
  const h = health.data;
  const warn = (n: number | undefined) => (n ? <span style={{ color: 'var(--warn)' }}>{n}</span> : 0);
  return (
    <section aria-labelledby="health-title" style={{ marginTop: 48 }}>
      <SectionHeader id="health-title" eyebrow="Operations" title="Health" size="sm" />
      {health.isError && <ErrorState compact what="health" onRetry={() => health.refetch()} />}
      {h && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
          <StatTile label="Errors · 1 h" value={warn(h.errors_1h)} sub={h.errors_24h + ' in 24 h'} />
          <StatTile label="Failed payouts" value={warn(h.failed_payouts)} />
          <StatTile label="Failed refunds" value={warn(h.failed_refunds)} />
          <StatTile label="Stuck settlements" value={warn(h.stuck_settlements)} sub="pending > 1 h" />
          <StatTile label="Overdue inspections" value={warn(h.overdue_inspections)} sub="shipped > 7 days" />
          <StatTile label="Open disputes" value={h.open_disputes} />
          <StatTile label="Reviews waiting" value={h.pending_reviews} />
        </div>
      )}
      <h3 style={{ fontSize: 14, margin: '24px 0 10px' }}>Browser errors · last 7 days</h3>
      {errors.data && !errors.data.length && <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>None reported.</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {(errors.data ?? []).map((e) => (
          <Card key={e.fingerprint} tight>
            <details>
              <summary style={{ cursor: 'pointer', display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 13.5 }}>
                <span className="mono" style={{ flex: '1 1 300px', wordBreak: 'break-word' }}>
                  {e.message}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  ×{e.count} · {formatDate(e.last_seen, lang, true)}
                </span>
              </summary>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                {e.url} · release {e.release ?? '—'}
              </div>
              {e.stack && (
                <pre className="mono" style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: '8px 0 0', color: 'var(--text-2)' }}>
                  {e.stack}
                </pre>
              )}
            </details>
          </Card>
        ))}
      </div>
    </section>
  );
}
