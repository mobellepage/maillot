// Designed replacements for the old window.prompt / window.confirm flows.
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import type { Order } from '../../utils/db.ts';
import { PhotoSlotsField } from './OrderPhotos.tsx';
import { usePhotoSlots, type PhotoSlots, type Slot } from './photoSlots.ts';
import { Button, Dialog, Notice, TextField } from '../../ui/index.ts';
import { CARRIERS, CARRIER_IDS, carrierName, detectCarrier, type Carrier } from './shipping.ts';

/** The seller ships straight to the buyer: address, optional prepaid label, shirt photo, carrier and tracking. */
export function ShipDialog({ order, onClose, onSubmit, busy }: { order: Order | null; onClose: () => void; onSubmit: (tracking: string, carrier: Carrier, photos: PhotoSlots) => void; busy: boolean }) {
  const { t } = usePrefs();
  const orderId = order?.id ?? null;
  const [tracking, setTracking] = useState('');
  const [picked, setPicked] = useState<Carrier | ''>('');
  const label = useMutation({ mutationFn: () => db.requestShippingLabel(orderId!) });
  const address = useQuery({ queryKey: ['ship-to', orderId], enabled: !!orderId, queryFn: () => db.loadShipTo(orderId!) });
  const slots = usePhotoSlots(SHIP_SLOTS);
  const detected = detectCarrier(tracking);
  const carrier = picked || detected;
  const result = label.data;
  const ready = slots.complete && tracking.trim().length > 0 && !!carrier;
  const code = orderId ? orderId.slice(0, 8).toUpperCase() : '';
  const a = address.data?.address;

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
          if (ready && carrier) onSubmit(tracking.trim(), carrier, slots);
        }}
      >
        <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t('ship.intro', { code })}</p>
        <address style={{ fontStyle: 'normal', fontSize: 14, lineHeight: 1.6, padding: '12px 14px', borderRadius: 12, background: 'var(--sunken)', border: '1px solid var(--line)' }}>
          {address.isLoading ? (
            t('ship.addressLoading')
          ) : a ? (
            <>
              <div>{address.data?.name}</div>
              <div>{a.line1}</div>
              {a.line2 && <div>{a.line2}</div>}
              <div>
                {a.postal_code} {a.city}
                {a.country && a.country !== 'CH' ? ', ' + a.country : ''}
              </div>
            </>
          ) : (
            t('ship.noAddress')
          )}
        </address>
        <div style={{ margin: '14px 0 18px' }}>
          <Button variant="ghost" size="sm" busy={label.isPending} busyLabel={t('ship.creatingLabel')} onClick={getLabel}>
            {result?.configured && result.url ? t('ship.openLabel') : t('ship.getLabel')}
          </Button>
          {result && !result.configured && <Notice style={{ marginTop: 10 }}>{t('ship.labelsOff')}</Notice>}
          {result?.configured && result.error && <Notice tone="neg" style={{ marginTop: 10 }}>{result.error}</Notice>}
          {label.isError && <Notice tone="neg" style={{ marginTop: 10 }}>{t('ship.labelFailed')}</Notice>}
        </div>
        <PhotoSlotsField s={slots} legend={t('ship.photos')} hint={t('ship.photosHint')} />
        <div style={{ marginTop: 18 }}>
          <TextField
            label={t('ship.tracking')}
            placeholder={t('ship.trackingPh')}
            value={tracking}
            onChange={(e) => setTracking(e.target.value.slice(0, 60))}
            hint={detected && !picked ? t('ship.looksLike', { carrier: carrierName(detected) }) : t('ship.required')}
            required
          />
        </div>
        <label htmlFor="ship-carrier" style={{ display: 'block', fontSize: 14, fontWeight: 600, margin: '16px 0 10px' }}>
          {t('ship.carrier')}
        </label>
        <div className="field">
          <select id="ship-carrier" required value={picked || detected || ''} onChange={(e) => setPicked(e.target.value as Carrier | '')}>
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
          <Button type="submit" disabled={!ready} busy={busy} busyLabel={t('ship.saving')} style={{ flex: 1.4 }}>
            {t('ship.markShipped')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const SHIP_SLOTS: Slot[] = [
  ['shirt', 'ship.photo.shirt', true],
  ['parcel', 'ship.photo.parcel', false]
];
const RECEIPT_SLOTS: Slot[] = [
  ['received', 'rel.photo.shirt', true],
  ['label', 'rel.photo.label', false]
];

/** The buyer confirms with a photo of the shirt they received; that releases the payment. */
export function ReceiptDialog({ order, onClose, onConfirm, busy, amountFmt }: { order: Order | null; onClose: () => void; onConfirm: (photos: PhotoSlots) => void; busy: boolean; amountFmt: string }) {
  const { t } = usePrefs();
  const slots = usePhotoSlots(RECEIPT_SLOTS);
  const code = order ? order.id.slice(0, 8).toUpperCase() : '';
  return (
    <Dialog open={!!order} onClose={onClose} title={t('rel.title')}>
      <PhotoSlotsField s={slots} legend={t('rel.photos')} hint={t('rel.photosHint', { code })} />
      <Notice tone="warn" style={{ marginTop: 16 }}>
        {t('rel.warn', { amount: amountFmt })}
      </Notice>
      <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t('rel.body')}</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
          {t('rel.notYet')}
        </Button>
        <Button disabled={!slots.complete} busy={busy} busyLabel={t('rel.releasing')} onClick={() => onConfirm(slots)} style={{ flex: 1.4 }}>
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
