// Guided photo capture: one shot at a time with a live camera, a framing
// outline for that shot, and an instant quality check (sharpness, light,
// resolution) before moving on. Falls back to the phone's own camera picker
// when live video isn't available or permission is refused.
import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '../../../lib/prefs.tsx';
import type { Photo } from '../../../types/domain.ts';
import { Button, Dialog, Notice } from '../../../ui/index.ts';
import { FRAME, frameCrop, guideFor, nextMissing, photoIssues, type GuideShape } from './guide.ts';
import { usePhotoUrls } from '../../../lib/usePhotoUrls.ts';

type Spec = { key: string; label: string; hint?: string };

// Insecure origins and some in-app browsers have no camera API at all.
const hasCamera = () => typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';

/**
 * A shirt lying flat, sleeves spread, filling the frame — so every front
 * photo in the collection looks alike.
 */
const FLAT_SHIRT = 'M40 9 Q50 16 60 9 L68 11 L84 26 L77 38 L69 32 L70 88 L30 88 L31 32 L23 38 L16 26 L32 11 Z';

function Outline({ shape }: { shape: GuideShape }) {
  const { t } = usePrefs();
  const stroke = { fill: 'none', stroke: 'rgba(255,255,255,0.85)', strokeWidth: 2.5, strokeDasharray: '10 8' } as const;
  if (shape === 'shirt')
    return (
      <div aria-hidden="true" style={{ position: 'absolute', top: '50%', left: '50%', height: FRAME * 100 + '%', aspectRatio: '1 / 1', transform: 'translate(-50%,-50%)', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', border: '2px solid rgba(255,255,255,0.9)', pointerEvents: 'none' }}>
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.6))' }}>
          <path {...stroke} d={FLAT_SHIRT} vectorEffect="non-scaling-stroke" />
        </svg>
        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 8, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{t('gc.flatHint')}</span>
      </div>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: '6%', width: '88%', height: '88%', pointerEvents: 'none', filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.6))' }}>
      {shape === 'square' && <rect {...stroke} x="18" y="18" width="64" height="64" rx="6" vectorEffect="non-scaling-stroke" />}
      {shape === 'label' && <rect {...stroke} x="30" y="10" width="40" height="80" rx="4" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

export function GuidedCapture({ specs, photos, startKey, onShot, onClose }: { specs: Spec[]; photos: Record<string, Photo>; startKey: string | null; onShot: (spec: Spec, file: File) => Promise<Photo | null>; onClose: () => void }) {
  const { t } = usePrefs();
  const keys = specs.map((s) => s.key);
  const [key, setKey] = useState<string | null>(startKey ?? nextMissing(keys, photos));
  const [camera, setCamera] = useState<'starting' | 'live' | 'unavailable'>(() => (hasCamera() ? 'starting' : 'unavailable'));
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Photo | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const spec = specs.find((s) => s.key === key) ?? null;
  const index = spec ? keys.indexOf(spec.key) : -1;
  const previewUrl = usePhotoUrls([review ?? undefined], true)(review ?? undefined);

  useEffect(() => {
    if (!hasCamera()) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((tr) => tr.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
        setCamera('live');
      })
      .catch(() => !cancelled && setCamera('unavailable'));
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const handle = async (file: File) => {
    if (!spec) return;
    setBusy(true);
    const photo = await onShot(spec, file);
    setBusy(false);
    if (!photo) return;
    if (photoIssues(photo).length) setReview(photo);
    else setKey(nextMissing(keys, { ...photos, [spec.key]: photo }, spec.key));
  };

  const shoot = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    if (spec && guideFor(spec.key) === 'shirt') {
      // Keep just what's inside the shirt frame: a square with the shirt filling it.
      const r = frameCrop(v.videoWidth, v.videoHeight, v.clientWidth || v.videoWidth, v.clientHeight || v.videoHeight);
      c.width = c.height = r.size;
      c.getContext('2d')?.drawImage(v, r.x, r.y, r.size, r.size, 0, 0, r.size, r.size);
    } else {
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d')?.drawImage(v, 0, 0);
    }
    c.toBlob((b) => b && handle(new File([b], (spec?.key ?? 'photo') + '.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92);
  };

  const done = !spec;
  return (
    <Dialog open onClose={onClose} title={done ? t('gc.doneTitle') : t('gc.step', { n: index + 1, total: specs.length })} width={640}>
      {done ? (
        <>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text-2)' }}>{t('gc.doneBody')}</p>
          <Button block onClick={onClose} style={{ marginTop: 18 }}>
            {t('gc.finish')}
          </Button>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{spec.label}</div>
          {spec.hint && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{spec.hint}</div>}

          {review ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ aspectRatio: '4/3', borderRadius: 14, background: previewUrl ? `url(${previewUrl}) center/contain no-repeat, var(--sunken)` : 'var(--sunken)' }} role="img" aria-label={spec.label} />
              <Notice tone="warn" style={{ marginTop: 12 }}>
                {photoIssues(review)
                  .map((k) => t(k))
                  .join(' ')}
              </Notice>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <Button
                  variant="ghost"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setReview(null);
                    setKey(nextMissing(keys, photos, spec.key) ?? null);
                  }}
                >
                  {t('gc.useAnyway')}
                </Button>
                <Button style={{ flex: 1.3 }} onClick={() => setReview(null)}>
                  {t('gc.retake')}
                </Button>
              </div>
            </div>
          ) : camera === 'unavailable' ? (
            <div style={{ marginTop: 14 }}>
              <Notice>{t('gc.noCamera')}</Notice>
              <label className="btn btn--primary btn--block" style={{ marginTop: 14 }} aria-busy={busy || undefined}>
                {busy ? t('gc.checking') : t('gc.takePhoto')}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) handle(f);
                  }}
                />
              </label>
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
                <video ref={video} autoPlay playsInline muted aria-label={t('gc.viewfinder')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <Outline shape={guideFor(spec.key)} />
                {camera === 'starting' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>{t('gc.starting')}</div>}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 0' }}>{t('gc.tip')}</p>
              <Button block size="lg" busy={busy} busyLabel={t('gc.checking')} disabled={camera !== 'live'} onClick={shoot} style={{ marginTop: 12 }}>
                {t('gc.shoot')}
              </Button>
            </div>
          )}

          <ol aria-label={t('gc.shots')} style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {specs.map((s, i) => (
              <li key={s.key}>
                <button
                  type="button"
                  aria-current={s.key === key ? 'step' : undefined}
                  aria-label={s.label + (photos[s.key] ? ' ✓' : '')}
                  onClick={() => {
                    setReview(null);
                    setKey(s.key);
                  }}
                  className="mono"
                  style={{ width: 30, height: 30, borderRadius: 8, fontSize: 11, cursor: 'pointer', border: s.key === key ? '2px solid var(--text)' : '1px solid var(--line-strong)', background: photos[s.key] ? 'var(--accent-fill)' : 'var(--sunken)', color: photos[s.key] ? 'var(--accent-ink)' : 'var(--text-2)' }}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </Dialog>
  );
}
