// Where the shirt physically is: inbound to the Zürich centre, being
// inspected, or forwarded to the buyer — with carrier tracking links.
import { Link } from 'react-router';
import type { Order } from '../../utils/db.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { carrierName, trackingUrl } from './shipping.ts';

function Track({ carrier, code }: { carrier: string | null; code: string }) {
  const { t } = usePrefs();
  const url = trackingUrl(carrier, code);
  const name = carrier === 'other' ? t('carrier.other') : carrier ? carrierName(carrier) : t('carrier.generic');
  const label = `${name} ${code}`;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer noopener">
      {label}
    </a>
  ) : (
    <span className="mono">{label}</span>
  );
}

export function ShipmentLine({ order: o, isBuyer, certificate }: { order: Order; isBuyer: boolean; certificate?: string }) {
  const { t } = usePrefs();
  const style = { fontSize: 12.5, marginTop: 6, color: 'var(--text-2)', lineHeight: 1.5 };
  if (o.status === 'shipped' && o.inspection === 'pending')
    return (
      <div style={style}>
        {t('shl.atCentre')}
        {o.tracking_code ? ' · ' : ''}
        {o.tracking_code && <Track carrier={o.carrier} code={o.tracking_code} />}
      </div>
    );
  if (o.inspection === 'passed' && (o.status === 'shipped' || o.status === 'released' || o.status === 'disputed'))
    return (
      <div style={style}>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('shl.authenticated')}</span>
        {o.status === 'shipped' && (isBuyer ? t('shl.toYou') : t('shl.toBuyer'))}
        {o.outbound_tracking && isBuyer && (
          <>
            {' · '}
            <Track carrier={o.outbound_carrier} code={o.outbound_tracking} />
          </>
        )}
        {certificate && (
          <>
            {' · '}
            <Link to={'/verify/' + certificate}>{t('shl.certificate')}</Link>
          </>
        )}
      </div>
    );
  if (o.inspection === 'failed')
    return (
      <div style={{ ...style, color: 'var(--neg)' }}>
        {t('shl.failed')}
        {!isBuyer && o.inspection_note ? `: ${o.inspection_note}` : ''}
        {!isBuyer && t('shl.returning')}
      </div>
    );
  return null;
}
