// Reports from members (App Store guideline 1.2): look at each within 24
// hours. "Remove" takes the content down (comment deleted, shirt private,
// message dismissed, profile picture and bio cleared), "Keep" closes it.
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { ContentReport } from '../../utils/db.ts';
import { Badge, Button, Card, ErrorState, SectionHeader } from '../../ui/index.ts';

function contentLink(r: ContentReport): string | null {
  if (r.kind === 'profile') return r.target_handle ? '/u/' + r.target_handle : null;
  if (r.item_id && r.target_handle) return '/u/' + r.target_handle + '/' + encodeURIComponent(r.item_id) + (r.kind === 'comment' ? '#comments' : '');
  return null;
}

export function ReportsPanel() {
  const { t, lang } = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const [all, setAll] = useState(false);
  const reports = useQuery({ queryKey: ['adminReports', all], queryFn: () => db.loadReports(all ? 'all' : 'open') });
  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'removed' | 'dismissed' }) => db.resolveReport(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminReports'] }),
    onError: (e: Error) => toast('Error: ' + e.message)
  });
  const list = reports.data ?? [];
  return (
    <section id="reports" aria-labelledby="reports-title" style={{ marginTop: 48 }}>
      <SectionHeader id="reports-title" eyebrow="Moderation" title={t('mod.admin.title') + (list.length && !all ? ` (${list.length})` : '')} size="sm" />
      <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5 }}>{t('mod.admin.lede')}</p>
      <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13.5, marginBottom: 12 }}>
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
        {t('mod.admin.showAll')}
      </label>
      {reports.isError && <ErrorState compact what={t('mod.admin.title')} onRetry={() => reports.refetch()} />}
      {reports.data && !list.length && <p style={{ fontSize: 14, color: 'var(--muted)' }}>{t('mod.admin.none')}</p>}
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map((r) => {
          const to = contentLink(r);
          return (
            <Card key={r.id} tight style={{ display: 'grid', gap: 8, fontSize: 13.5 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge tone={r.status === 'open' ? 'accent' : 'neutral'}>{r.status === 'open' ? t('mod.reportWhat.' + r.kind) : t('mod.admin.status.' + r.status)}</Badge>
                <strong>{r.target_handle ? '@' + r.target_handle : '–'}</strong>
                <span style={{ color: 'var(--text-2)' }}>{t('mod.reason.' + r.reason)}</span>
                <span style={{ color: 'var(--muted)' }}>
                  {formatDate(r.created_at, lang)} · {t('mod.admin.by', { handle: r.reporter ?? '?' })}
                </span>
                {r.reports_on_user > 1 && <span style={{ color: 'var(--danger, #c0392b)', fontWeight: 600 }}>{t('mod.admin.count', { n: r.reports_on_user })}</span>}
              </div>
              {r.snapshot && <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>“{r.snapshot}”</p>}
              {r.note && <p style={{ margin: 0, color: 'var(--text-2)' }}>{r.note}</p>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {to && (
                  <Link to={to} className="btn btn--ghost btn--sm">
                    {t('mod.admin.open')}
                  </Link>
                )}
                {r.status === 'open' && (
                  <>
                    <Button size="sm" variant="danger" busy={resolve.isPending && resolve.variables?.id === r.id && resolve.variables.action === 'removed'} onClick={() => resolve.mutate({ id: r.id, action: 'removed' })}>
                      {t('mod.admin.remove')}
                    </Button>
                    <Button size="sm" variant="secondary" busy={resolve.isPending && resolve.variables?.id === r.id && resolve.variables.action === 'dismissed'} onClick={() => resolve.mutate({ id: r.id, action: 'dismissed' })}>
                      {t('mod.admin.dismiss')}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
