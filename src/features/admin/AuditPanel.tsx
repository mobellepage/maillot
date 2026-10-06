// The append-only record of admin actions (written by database triggers).
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { ErrorState, SectionHeader } from '../../ui/index.ts';

export function AuditPanel() {
  const { isAdmin, user } = useSession();
  const { lang } = usePrefs();
  const q = useQuery({ queryKey: ['auditLog'], enabled: isAdmin, queryFn: db.loadAuditLog });
  return (
    <section aria-labelledby="audit-title" style={{ marginTop: 48 }}>
      <SectionHeader id="audit-title" eyebrow="Security" title="Audit log" size="sm" />
      {q.isError && <ErrorState compact what="the audit log" onRetry={() => q.refetch()} />}
      {q.data && !q.data.length && <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>No admin actions yet.</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {(q.data ?? []).map((e) => (
            <tr key={e.id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '7px 8px 7px 0', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(e.at, lang, true)}</td>
              <td className="mono" style={{ padding: '7px 8px' }}>
                {e.action}
              </td>
              <td className="mono" style={{ padding: '7px 8px', color: 'var(--text-2)', wordBreak: 'break-all' }}>
                {e.target.slice(0, 18)}
              </td>
              <td style={{ padding: '7px 0', color: 'var(--muted)' }}>{e.actor === user?.id ? 'you' : e.actor ? e.actor.slice(0, 8) : 'system'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
