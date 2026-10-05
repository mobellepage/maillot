// The Zürich authentication centre's worklist: shirts on their way in, then
// a pass (forward to the buyer, outbound tracking) or fail (buyer refunded,
// shirt returned) decision per order.
import { useState } from 'react';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { Inspection } from '../../utils/db.ts';
import { Badge, Button, Card, SectionHeader, TextField } from '../../ui/index.ts';
import { carrierName, detectCarrier, trackingUrl } from '../orders/shipping.ts';
import { useInspections, useRecordInspection, useOutboundLabel } from './queries.ts';

const nameOf = (i: Inspection) => (i.shirt_id ? (BY[i.shirt_id]?.name ?? i.shirt_id) : 'Custom item (' + i.custom_item_id + ')');

function Address({ value }: { value: Inspection['ship_to'] }) {
  const a = (value ?? {}) as { name?: string; address?: { line1?: string; line2?: string; postal_code?: string; city?: string; country?: string } };
  if (!a.address) return <span style={{ color: 'var(--warn)' }}>No delivery address on file</span>;
  return (
    <span>
      {[a.name, a.address.line1, a.address.line2, [a.address.postal_code, a.address.city].filter(Boolean).join(' '), a.address.country].filter(Boolean).join(', ')}
    </span>
  );
}

function InspectionCard({ i }: { i: Inspection }) {
  const { money, lang } = usePrefs();
  const record = useRecordInspection();
  const outLabel = useOutboundLabel();
  const [note, setNote] = useState('');
  const [outbound, setOutbound] = useState(i.outbound_tracking ?? '');
  const arrived = !!i.shipped_at;
  const inUrl = trackingUrl(i.carrier, i.tracking_code);
  return (
    <Card style={{ padding: 18, borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{nameOf(i)}</h3>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            {i.size} · {money(Number(i.amount))}
          </div>
        </div>
        <Badge tone={arrived ? 'info' : 'neutral'}>{arrived ? 'Shipped by seller' : 'Awaiting seller'}</Badge>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 10, lineHeight: 1.6 }}>
        <div>
          Inbound:{' '}
          {i.tracking_code ? (
            inUrl ? (
              <a href={inUrl} target="_blank" rel="noreferrer noopener">
                {carrierName(i.carrier)} {i.tracking_code}
              </a>
            ) : (
              i.tracking_code
            )
          ) : (
            '—'
          )}
          {i.shipped_at && ` · ${formatDate(i.shipped_at, lang)}`}
        </div>
        <div>
          Deliver to: <Address value={i.ship_to} />
        </div>
      </div>
      {arrived && (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField srLabel="Outbound tracking" value={outbound} onChange={(e) => setOutbound(e.target.value)} placeholder="Outbound tracking (to buyer)" style={{ flex: '1 1 220px' }} />
            <Button
              size="sm"
              variant="ghost"
              busy={outLabel.isPending}
              onClick={() => outLabel.mutate(i.order_id, { onSuccess: (r) => r.configured && r.tracking && setOutbound(r.tracking) })}
            >
              Outbound label
            </Button>
          </div>
          <TextField srLabel="Inspection note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Inspection note (shown to the seller on a fail)" style={{ marginTop: 10 }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <Button size="sm" disabled={record.isPending} onClick={() => record.mutate({ id: i.order_id, passed: true, note, outbound, carrier: detectCarrier(outbound) })}>
              Passed — forward to buyer
            </Button>
            <Button size="sm" variant="danger" disabled={record.isPending} onClick={() => record.mutate({ id: i.order_id, passed: false, note, outbound: '', carrier: null })}>
              Failed — refund buyer
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

export function InspectionPanel() {
  const list = useInspections().data ?? [];
  const arrived = list.filter((i) => i.shipped_at);
  const incoming = list.filter((i) => !i.shipped_at);
  return (
    <section aria-labelledby="inspections-title" style={{ marginTop: 48 }}>
      <SectionHeader id="inspections-title" eyebrow="Authentication centre" title="Inspections" size="sm" />
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '-12px 0 0', lineHeight: 1.5, maxWidth: 560 }}>
        A pass forwards the shirt and starts the buyer’s confirmation window; a fail refunds the buyer. Both sides are notified.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        {!list.length && <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Nothing on its way in.</p>}
        {[...arrived, ...incoming].map((i) => (
          <InspectionCard key={i.order_id} i={i} />
        ))}
      </div>
    </section>
  );
}
