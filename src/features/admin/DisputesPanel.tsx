import { useState } from 'react';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { AdminDispute } from '../../utils/db.ts';
import { Button, Card, SectionHeader, TextField, useConfirm, ErrorState } from '../../ui/index.ts';
import { useAdminDisputes, useResolveDispute } from './queries.ts';

const nameOf = (d: AdminDispute) => (d.shirt_id ? BY[d.shirt_id]?.name ?? d.shirt_id : 'Custom item (' + d.custom_item_id + ')');

function DisputeCard({ d }: { d: AdminDispute }) {
  const { money, lang } = usePrefs();
  const resolve = useResolveDispute();
  const [note, setNote] = useState('');
  const confirm = useConfirm();
  const decide = async (outcome: 'release' | 'refund') => {
    const ok = await confirm(
      outcome === 'refund'
        ? { title: 'Refund the buyer?', body: `${money(Number(d.amount))} goes back to the buyer and the order closes. This can’t be undone.`, confirmLabel: 'Refund buyer', tone: 'danger' }
        : { title: 'Release to the seller?', body: `${money(Number(d.amount))} is paid out to the seller and the order closes. This can’t be undone.`, confirmLabel: 'Release payment' }
    );
    if (ok) resolve.mutate({ id: d.dispute_id, outcome, note });
  };
  return (
    <Card style={{ padding: 18, borderRadius: 16, borderColor: 'rgba(255,107,94,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{nameOf(d)}</h3>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            {d.size} · {money(Number(d.amount))}
          </div>
        </div>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>
          {formatDate(d.created_at, lang, true)}
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '10px 0 0', lineHeight: 1.5 }}>Reason: {d.reason || '—'}</p>
      <TextField srLabel="Resolution note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resolution note (optional)" style={{ marginTop: 12 }} />
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <Button size="sm" disabled={resolve.isPending} onClick={() => decide('release')}>
          Release to seller
        </Button>
        <Button size="sm" variant="danger" disabled={resolve.isPending} onClick={() => decide('refund')}>
          Refund buyer
        </Button>
      </div>
    </Card>
  );
}

export function DisputesPanel() {
  const { t } = usePrefs();
  const q = useAdminDisputes();
  const all = q.data ?? [];
  const open = all.filter((d) => d.dispute_status === 'open');
  const done = all.filter((d) => d.dispute_status !== 'open').slice(0, 20);
  return (
    <section aria-labelledby="disputes-title" style={{ marginTop: 48 }}>
      <SectionHeader id="disputes-title" eyebrow="Disputes" title="Returns & disputes" size="sm" />
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '-12px 0 0', lineHeight: 1.5, maxWidth: 560 }}>A decision releases the escrowed payment to the seller or refunds the buyer. Both are notified automatically.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        {q.isError && <ErrorState compact what={t('what.disputes')} onRetry={() => q.refetch()} />}
        {q.isSuccess && !open.length && <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>No open disputes.</p>}
        {open.map((d) => (
          <DisputeCard key={d.dispute_id} d={d} />
        ))}
      </div>
      {done.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '28px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {done.map((h) => (
            <li key={h.dispute_id} className="card card--tight" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 10, fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-2)' }}>{nameOf(h)}</span>
              <span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>
                {h.dispute_status === 'resolved_release' ? 'Released to seller' : 'Buyer refunded'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
