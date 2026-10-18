// Steps 4–6: photos, automatic pre-check, expert verification.
import { useState } from 'react';
import { buildPhotoSpecs } from '../../../addShirtData.js';
import type { Photo } from '../../../types/domain.ts';
import { GuidedCapture } from './GuidedCapture.tsx';
import { Button, Card, Notice } from '../../../ui/index.ts';
import { VERIFY_BADGES } from '../model.ts';
import { PhotoSlot } from './parts.tsx';
import { usePrefs } from '../../../lib/prefs.tsx';
import type { Wizard } from './useAddShirtForm.ts';

export function PhotosStep({ w, busyKey, onPhoto }: { w: Wizard; busyKey: string | null; onPhoto: (spec: { key: string; label: string }, f: File) => Promise<Photo | null> }) {
  const [guided, setGuided] = useState(false);
  // Front and back are always taken in the shirt frame.
  const [framed, setFramed] = useState<{ key: string; label: string; hint?: string } | null>(null);
  const { t } = usePrefs();
  const specs = buildPhotoSpecs(w.f, t) as { key: string; label: string; hint?: string; required: boolean; forSale: boolean }[];
  // This step is only on the way to a sale: what buyers need is all required.
  const required = specs.filter((s) => s.required || s.forSale);
  const extras = specs.filter((s) => !s.required && !s.forSale);
  const done = required.filter((s) => w.f.photos[s.key]).length;
  const slot = (spec: (typeof specs)[number]) => (
    <PhotoSlot key={spec.key} spec={spec} data={w.f.photos[spec.key]} busy={busyKey === spec.key} onFile={(file) => onPhoto(spec, file)} onRemove={() => w.removePhoto(spec.key)} guided={spec.key === 'front' || spec.key === 'back' ? () => setFramed(spec) : undefined} />
  );
  return (
    <div>
      <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 16px' }}>{t('as.p.intro')}</p>
      {done < required.length && (
        <Card tight accent style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 240px', fontSize: 13.5, color: 'var(--text-2)' }}>{t('gc.startBody')}</div>
          <Button size="sm" onClick={() => setGuided(true)}>
            {t('gc.start')}
          </Button>
        </Card>
      )}
      {guided && <GuidedCapture specs={required} photos={w.f.photos} startKey={null} onShot={onPhoto} onClose={() => setGuided(false)} />}
      {framed && (
        <GuidedCapture
          specs={[framed]}
          photos={w.f.photos}
          startKey={framed.key}
          onShot={async (spec, file) => {
            const p = await onPhoto(spec, file);
            setFramed(null);
            return p;
          }}
          onClose={() => setFramed(null)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={required.length} aria-valuenow={done} aria-label={t('as.p.progress')} style={{ flex: 1, height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: (done / required.length) * 100 + '%', background: 'var(--accent-fill)', transition: 'width .3s' }} />
        </div>
        <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)', flex: 'none' }}>
          {t('as.p.count', { done, total: required.length })}
        </span>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>{t('as.p.required')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{required.map(slot)}</div>
      {extras.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '24px 0 4px' }}>{t('as.p.extras')}</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.45 }}>{t('as.p.extrasHint')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{extras.map(slot)}</div>
        </>
      )}
    </div>
  );
}

export function PrecheckStep({ w }: { w: Wizard }) {
  const { t, lang } = usePrefs();
  const p = w.f.precheck;
  const run = () => void w.runPrecheck(lang);
  if (!p || w.check.busy) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ fontSize: 14.5, color: 'var(--text-2)', margin: '0 0 20px', lineHeight: 1.5 }}>{t('as.pc.intro')}</p>
        <Button onClick={run} busy={w.check.busy} busyLabel={t('as.pc.checking')}>
          {t('as.pc.start')}
        </Button>
      </div>
    );
  }
  const tone = p.status === 'ok' ? 'accent' : p.status === 'review' ? 'warn' : 'neg';
  return (
    <Notice tone={tone} style={{ padding: 22, borderRadius: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 17 }}>{p.status === 'ok' ? t('as.pc.ok') : p.status === 'review' ? t('as.pc.review') : t('as.pc.fake')}</div>
      <ul style={{ margin: '12px 0 0', padding: '0 0 0 18px', color: 'var(--text-2)' }}>
        {p.notes.map((n, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            {t(n)}
          </li>
        ))}
        {(p.reasons ?? []).map((r, i) => (
          <li key={'ai' + i} style={{ marginBottom: 6 }}>
            {r}
          </li>
        ))}
      </ul>
      {p.productCode && <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '8px 0 0' }}>{t('as.pc.code', { code: p.productCode })}</p>}
      {w.check.skipped && <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 0' }}>{t('as.pc.ai.' + w.check.skipped)}</p>}
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '14px 0 0' }}>{t('as.pc.disclaimer')}</p>
      <button type="button" className="link-btn link-btn--muted" onClick={run} style={{ marginTop: 14, fontSize: 12.5, textDecoration: 'underline' }}>
        {t('as.pc.again')}
      </button>
    </Notice>
  );
}

export function VerifyStep({ w }: { w: Wizard }) {
  const { f } = w;
  const { t } = usePrefs();
  const badge = VERIFY_BADGES[f.verification.level] ?? VERIFY_BADGES.self;
  return (
    <div>
      <Card tight style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderColor: badge.color + '55' }}>
        <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: '50%', background: badge.color, flex: 'none' }} />
        <div>
          <div style={{ fontWeight: 700, color: badge.color }}>{t(badge.label)}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{t(badge.desc)}</div>
        </div>
      </Card>
      <dl style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 20px' }}>
        {(['self', 'precheck', 'expert'] as const).map((k) => (
          <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5, color: 'var(--faint)' }}>
            <dt className="mono" style={{ fontWeight: 700, color: VERIFY_BADGES[k].color, flex: 'none' }}>
              {t(VERIFY_BADGES[k].label)}
            </dt>
            <dd style={{ margin: 0 }}>{t(VERIFY_BADGES[k].desc)}</dd>
          </div>
        ))}
      </dl>
      {f.version === 'Match-Worn' && f.verification.level !== 'expert' && <Notice tone="warn" style={{ marginBottom: 16 }}>{t('as.v.mwNotice')}</Notice>}
      <div aria-live="polite">
        {f.verification.status === 'none' && <Button onClick={w.requestVerification}>{t('as.v.request')}</Button>}
        {f.verification.status === 'angefragt' && <p style={{ fontSize: 14, color: 'var(--text-2)' }}>{t('as.v.requested')}</p>}
        {f.verification.status === 'in Prüfung' && <p style={{ fontSize: 14, color: 'var(--text-2)' }}>{t('as.v.inReview')}</p>}
        {f.verification.status === 'verifiziert' && <p style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>{t('as.v.verified')}</p>}
        {f.verification.status === 'abgelehnt' && (
          <div style={{ fontSize: 14, color: 'var(--neg)' }}>
            {t('as.v.rejected', { reason: t(f.verification.reason) })}
            <button type="button" className="link-btn link-btn--muted" onClick={w.requestVerification} style={{ display: 'block', marginTop: 10, fontSize: 12.5, textDecoration: 'underline' }}>
              {t('as.v.again')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
