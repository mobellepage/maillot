// Photos taken during an order: the seller's shipping photo and the buyer's
// receipt photo. They protect both sides in a dispute ("not received" /
// "not as described"). Stored in the uploader's own vault-photos folder;
// both parties (and support) can view them.
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { PhotoInput } from '../vault/addshirt/parts.tsx';
import type { PhotoSlots } from './photoSlots.ts';

export function PhotoSlotsField({ s, legend, hint }: { s: PhotoSlots; legend: string; hint?: string }) {
  const { t } = usePrefs();
  const warn = Object.values(s.photos).some((p) => p.lowRes || p.blurry || p.tooDark || p.tooBright);
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{legend}</legend>
      {hint && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.45 }}>{hint}</p>}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {s.slots.map(([kind, key, required]) => {
          const p = s.photos[kind];
          return (
            <div key={kind} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
              <PhotoInput
                size={88}
                data={p && { dataUrl: p.dataUrl, lowRes: p.lowRes, blurry: p.blurry, tooDark: p.tooDark, tooBright: p.tooBright }}
                busy={s.busy === kind}
                onFile={(file) => void s.add(kind, file)}
                label={t(key)}
              />
              <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: required ? 600 : 400 }}>
                {t(key)}
                {required && ' *'}
              </span>
            </div>
          );
        })}
      </div>
      {warn && <p style={{ fontSize: 12.5, color: 'var(--warn)', marginTop: 10 }}>{t('sell.photoQuality')}</p>}
    </fieldset>
  );
}

function asPhotos(v: unknown): db.OrderPhoto[] {
  return Array.isArray(v) ? v.filter((p): p is db.OrderPhoto => !!p && typeof p === 'object' && typeof (p as db.OrderPhoto).path === 'string') : [];
}

/** The order's shipping and receipt photos, for both parties. */
export function OrderPhotoGallery({ order }: { order: db.Order }) {
  const { t } = usePrefs();
  const groups = [
    ['ordp.shipped', asPhotos(order.ship_photos)],
    ['ordp.received', asPhotos(order.receipt_photos)]
  ] as const;
  const paths = groups.flatMap(([, ps]) => ps.map((p) => p.thumbPath ?? p.path));
  const full = groups.flatMap(([, ps]) => ps.map((p) => p.path));
  const urls = useQuery({ queryKey: ['order-photos', order.id, paths.join()], enabled: paths.length > 0, queryFn: () => db.signPhotoUrls([...paths, ...full]), staleTime: 50 * 60_000 });
  if (!paths.length) return null;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {groups.map(([key, ps]) =>
        ps.length ? (
          <div key={key}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t(key)}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ps.map((p) => {
                const thumb = urls.data?.[p.thumbPath ?? p.path];
                const big = urls.data?.[p.path];
                return (
                  <a key={p.path} href={big} target="_blank" rel="noreferrer noopener" aria-label={t(key)} style={{ width: 88, height: 88, borderRadius: 12, overflow: 'hidden', background: 'var(--sunken)', border: '1px solid var(--line)', display: 'block' }}>
                    {thumb && <img src={thumb} alt="" width={88} height={88} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </a>
                );
              })}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
