import { useState } from 'react';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { Review } from '../../types/domain.ts';
import { Badge, Button, Card, Notice, TextField } from '../../ui/index.ts';
import { useResolveReview, useReviewQueue } from './queries.ts';

function ReviewCard({ r }: { r: Review }) {
  const { lang } = usePrefs();
  const resolve = useResolveReview();
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');
  const name = (r.catalogId && BY[r.catalogId]?.name) || r.proposedName || 'Untitled shirt';
  const photos = Object.entries(r.photos || {});
  const pc = r.precheck;
  return (
    <Card style={{ padding: 20, borderRadius: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{name}</h3>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            {r.version} · {[r.sizeGroup, r.size, r.sleeve].filter(Boolean).join(' · ')}
          </div>
        </div>
        <Badge tone={r.status === 'pending' ? 'accent' : 'info'}>{r.status === 'pending' ? 'New' : 'In review'}</Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14, fontSize: 13, color: 'var(--text-2)' }}>
        <div>Condition: {r.condition ? r.condition.grade + '/10' + (r.condition.defects.length ? ' · ' + r.condition.defects.join(', ') : '') : '—'}</div>
        <div>Flock: {!r.flock || r.flock.source === 'Keine' ? 'None' : [r.flock.source, r.flock.name, r.flock.number && '#' + r.flock.number].filter(Boolean).join(' · ')}</div>
        <div>Patches: {r.patches?.length ? r.patches.join(', ') : 'None'}</div>
        <div>Signature: {r.signature?.signed ? 'Signed by ' + (r.signature.by || 'unknown') + (r.signature.hasCoa ? ' · COA (' + (r.signature.issuer || 'unknown') + ')' : ' · no COA') : 'Not signed'}</div>
        <div>Provenance: {r.provenance || '—'}</div>
      </div>
      {pc && (
        <Notice tone={pc.status === 'ok' ? 'accent' : pc.status === 'review' ? 'warn' : 'neg'} style={{ marginTop: 12, fontSize: 12.5 }}>
          <div className="mono" style={{ fontSize: 10.5, marginBottom: 4 }}>
            AUTOMATIC PRE-CHECK
          </div>
          {pc.notes.map((n, i) => (
            <div key={i}>· {n}</div>
          ))}
        </Notice>
      )}
      {photos.length > 0 && (
        <ul style={{ listStyle: 'none', padding: '0 0 4px', margin: '14px 0 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {photos.map(([k, p]) => (
            <li key={k} style={{ flex: 'none', textAlign: 'center' }}>
              <a href={p.dataUrl} target="_blank" rel="noreferrer" aria-label={'Open photo: ' + (p.label || k)} style={{ display: 'block', width: 72, height: 72, borderRadius: 10, background: `url(${p.dataUrl}) center/cover`, border: '1px solid rgba(255,255,255,0.1)' }} />
              <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 4, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label || k}</div>
            </li>
          ))}
        </ul>
      )}
      <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 12 }}>Requested {formatDate(r.submittedAt, lang, true)}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <Button size="sm" busy={resolve.isPending && resolve.variables?.approved} onClick={() => resolve.mutate({ id: r.id, approved: true })}>
          Verify
        </Button>
        {!reject && (
          <Button size="sm" variant="danger" onClick={() => setReject(true)}>
            Reject
          </Button>
        )}
      </div>
      {reject && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resolve.mutate({ id: r.id, approved: false, reason });
          }}
          style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}
        >
          <TextField srLabel="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the owner)" style={{ flex: '1 1 220px' }} autoFocus />
          <Button type="submit" size="sm" variant="danger" busy={resolve.isPending}>
            Confirm rejection
          </Button>
        </form>
      )}
    </Card>
  );
}

export function ReviewQueue() {
  const { lang } = usePrefs();
  const q = useReviewQueue();
  const all = q.data ?? [];
  const open = all.filter((r) => r.status === 'pending' || r.status === 'in_review');
  const history = all.filter((r) => r.status === 'approved' || r.status === 'rejected').sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0)).slice(0, 20);
  const stats: [string, number, string][] = [
    ['New', all.filter((r) => r.status === 'pending').length, 'var(--text-2)'],
    ['In review', all.filter((r) => r.status === 'in_review').length, 'var(--info)'],
    ['Verified', all.filter((r) => r.status === 'approved').length, 'var(--accent)'],
    ['Rejected', all.filter((r) => r.status === 'rejected').length, 'var(--neg)']
  ];
  return (
    <section aria-labelledby="queue-title">
      <h2 id="queue-title" className="sr-only">
        Verification queue
      </h2>
      <dl style={{ display: 'flex', gap: 10, margin: '20px 0 0', flexWrap: 'wrap' }}>
        {stats.map(([label, n, color]) => (
          <div key={label} className="card card--tight" style={{ flex: '1 1 110px', display: 'flex', flexDirection: 'column-reverse' }}>
            <dt style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{label}</dt>
            <dd className="mono" style={{ margin: 0, fontSize: 20, fontWeight: 700, color }}>
              {n}
            </dd>
          </div>
        ))}
      </dl>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
        {!q.isLoading && !open.length && <p style={{ fontSize: 14, color: 'var(--muted)', padding: '32px 0', margin: 0 }}>No open reviews.</p>}
        {open.map((r) => (
          <ReviewCard key={r.id} r={r} />
        ))}
      </div>
      {history.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: 'var(--text-2)' }}>Recently decided</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h) => (
              <li key={h.id} className="card card--tight" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 10, fontSize: 12.5 }}>
                <span style={{ color: 'var(--text-2)' }}>{(h.catalogId && BY[h.catalogId]?.name) || h.proposedName || 'Untitled shirt'}</span>
                <span className="mono" style={{ color: h.status === 'approved' ? 'var(--accent)' : 'var(--neg)', fontSize: 11 }}>
                  {h.status === 'approved' ? 'Verified' : 'Rejected'}
                </span>
                <span className="mono" style={{ color: 'var(--faint)', fontSize: 10.5 }}>
                  {h.reviewedAt ? formatDate(h.reviewedAt, lang, true) : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
