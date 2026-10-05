// Designed replacements for the old window.prompt / window.confirm flows.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { COMPANY } from '../../config/company.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { Button, Dialog, Notice, TextField } from '../../ui/index.ts';
import { CARRIERS, CARRIER_IDS, carrierName, detectCarrier, type Carrier } from './shipping.ts';

export function ShipDialog({ orderId, onClose, onSubmit, busy }: { orderId: string | null; onClose: () => void; onSubmit: (tracking: string, carrier: Carrier | null) => void; busy: boolean }) {
  const { t } = usePrefs();
  const [tracking, setTracking] = useState('');
  const [picked, setPicked] = useState<Carrier | ''>('');
  const label = useMutation({ mutationFn: () => db.requestShippingLabel(orderId!) });
  const detected = detectCarrier(tracking);
  const carrier = picked || detected;
  const result = label.data;

  const getLabel = () =>
    label.mutate(undefined, {
      onSuccess: (r) => {
        if (r.configured && r.url) {
          window.open(r.url, '_blank', 'noopener');
          if (r.tracking) {
            setTracking(r.tracking);
            setPicked('post');
          }
        }
      }
    });

  return (
    <Dialog open={!!orderId} onClose={onClose} title={t('ship.title')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(tracking.trim(), carrier || null);
        }}
      >
        <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t('ship.intro')}</p>
        <address style={{ fontStyle: 'normal', fontSize: 14, lineHeight: 1.6, padding: '12px 14px', borderRadius: 12, background: 'var(--sunken)', border: '1px solid var(--line)' }}>
          {COMPANY.authCentre.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </address>
        <div style={{ margin: '14px 0 18px' }}>
          <Button variant="ghost" size="sm" busy={label.isPending} busyLabel={t('ship.creatingLabel')} onClick={getLabel}>
            {result?.configured && result.url ? t('ship.openLabel') : t('ship.getLabel')}
          </Button>
          {result && !result.configured && <Notice style={{ marginTop: 10 }}>{t('ship.labelsOff')}</Notice>}
          {result?.configured && result.error && <Notice tone="neg" style={{ marginTop: 10 }}>{result.error}</Notice>}
          {label.isError && <Notice tone="neg" style={{ marginTop: 10 }}>{t('ship.labelFailed')}</Notice>}
        </div>
        <TextField
          label={t('ship.tracking')}
          placeholder={t('ship.trackingPh')}
          value={tracking}
          onChange={(e) => setTracking(e.target.value.slice(0, 60))}
          hint={detected && !picked ? t('ship.looksLike', { carrier: carrierName(detected) }) : t('ship.optional')}
          autoFocus
        />
        <label htmlFor="ship-carrier" style={{ display: 'block', fontSize: 14, fontWeight: 600, margin: '16px 0 10px' }}>
          {t('ship.carrier')}
        </label>
        <div className="field">
          <select id="ship-carrier" value={picked || detected || ''} onChange={(e) => setPicked(e.target.value as Carrier | '')}>
            <option value="">{t('ship.choose')}</option>
            {CARRIER_IDS.map((c) => (
              <option key={c} value={c}>
                {c === 'other' ? t('carrier.other') : CARRIERS[c].name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" busy={busy} busyLabel={t('ship.saving')} style={{ flex: 1.4 }}>
            {t('ship.markShipped')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ReleaseDialog({ open, onClose, onConfirm, busy, amountFmt }: { open: boolean; onClose: () => void; onConfirm: () => void; busy: boolean; amountFmt: string }) {
  const { t } = usePrefs();
  return (
    <Dialog open={open} onClose={onClose} title={t('rel.title')}>
      <Notice tone="warn">{t('rel.warn', { amount: amountFmt })}</Notice>
      <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t('rel.body')}</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
          {t('rel.notYet')}
        </Button>
        <Button busy={busy} busyLabel={t('rel.releasing')} onClick={onConfirm} style={{ flex: 1.4 }}>
          {t('rel.confirm')}
        </Button>
      </div>
    </Dialog>
  );
}

// Message keys. The reason sent to the server is in the buyer's language;
// staff read it as written.
const REASONS = ['disp.r.notArrived', 'disp.r.notDescribed', 'disp.r.damaged', 'disp.r.counterfeit', 'disp.r.other'] as const;

export function DisputeDialog({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (reason: string) => void; busy: boolean }) {
  const { t } = usePrefs();
  const [kind, setKind] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState('');
  const reason = t(kind) + (details.trim() ? ': ' + details.trim() : '');
  return (
    <Dialog open={open} onClose={onClose} title={t('disp.title')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason);
        }}
      >
        <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t('disp.intro')}</p>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t('disp.what')}</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REASONS.map((r) => (
              <button key={r} type="button" className="option-btn" aria-pressed={kind === r} onClick={() => setKind(r)} style={{ padding: '9px 14px', fontSize: 13.5 }}>
                {t(r)}
              </button>
            ))}
          </div>
        </fieldset>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, margin: '18px 0 10px' }} htmlFor="dispute-details">
          {t('disp.details')}
        </label>
        <textarea
          id="dispute-details"
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 1500))}
          rows={4}
          placeholder={t('disp.placeholder')}
          style={{ width: '100%', padding: 14, borderRadius: 12, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', fontSize: 14, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" busy={busy} busyLabel={t('disp.sending')} style={{ flex: 1.4 }}>
            {t('disp.open')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
