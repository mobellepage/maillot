// Where the shirt physically is: inbound to the Zürich centre, being
// inspected, or forwarded to the buyer — with carrier tracking links.
import type { Order } from '../../utils/db.ts';
import { carrierName, trackingUrl } from './shipping.ts';

function Track({ carrier, code }: { carrier: string | null; code: string }) {
  const url = trackingUrl(carrier, code);
  const label = `${carrierName(carrier)} ${code}`;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer noopener">
      {label}
    </a>
  ) : (
    <span className="mono">{label}</span>
  );
}

export function ShipmentLine({ order: o, isBuyer }: { order: Order; isBuyer: boolean }) {
  const style = { fontSize: 12.5, marginTop: 6, color: 'var(--text-2)', lineHeight: 1.5 };
  if (o.status === 'shipped' && o.inspection === 'pending')
    return (
      <div style={style}>
        On its way to / at our Zürich authentication centre{o.tracking_code ? ' · ' : ''}
        {o.tracking_code && <Track carrier={o.carrier} code={o.tracking_code} />}
      </div>
    );
  if (o.inspection === 'passed' && (o.status === 'shipped' || o.status === 'released' || o.status === 'disputed'))
    return (
      <div style={style}>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>✓ Authenticated</span>
        {o.status === 'shipped' && (isBuyer ? ' · on its way to you' : ' · forwarded to the buyer')}
        {o.outbound_tracking && isBuyer && (
          <>
            {' · '}
            <Track carrier={o.outbound_carrier} code={o.outbound_tracking} />
          </>
        )}
      </div>
    );
  if (o.inspection === 'failed')
    return (
      <div style={{ ...style, color: 'var(--neg)' }}>
        Didn’t pass authentication{!isBuyer && o.inspection_note ? `: ${o.inspection_note}` : ''}
        {!isBuyer && ' — we’re returning it to you.'}
      </div>
    );
  return null;
}
