// Photos of the actual shirt on the cheapest listing — what "Buy now" buys.
// Thumbnails under the price; tapping one opens the full-size photos.
import { useState } from 'react';
import { usePrefs } from '../../../lib/prefs.tsx';
import { usePhotoUrls } from '../../../lib/usePhotoUrls.ts';
import type { Ask } from '../../../utils/db.ts';
import type { ListingPhoto, Photo } from '../../../types/domain.ts';
import { Dialog } from '../../../ui/index.ts';

const KIND_KEY: Record<string, string> = { front: 'sell.photo.front', back: 'sell.photo.back', label: 'sell.photo.label', detail: 'sell.photo.detail' };

function askPhotos(ask: Pick<Ask, 'photos'> | null | undefined): ListingPhoto[] {
  const raw = ask?.photos;
  return Array.isArray(raw) ? (raw as unknown as ListingPhoto[]).filter((p) => p && typeof p.path === 'string') : [];
}

export function AskPhotos({ ask }: { ask: Ask }) {
  const { t } = usePrefs();
  const photos = askPhotos(ask);
  const asPhoto = (p: ListingPhoto): Photo => ({ path: p.path, ...(p.thumbPath ? { thumbPath: p.thumbPath } : {}) });
  const thumbs = usePhotoUrls(photos.map(asPhoto), true);
  const [open, setOpen] = useState<number | null>(null);
  const full = usePhotoUrls(open === null ? [] : photos.map(asPhoto));
  if (!photos.length) return <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0' }}>{t('pp.noPhotos')}</p>;
  const current = open === null ? null : photos[open];
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('pp.sellerPhotos')}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {photos.map((p, i) => (
          <button key={p.path} type="button" onClick={() => setOpen(i)} aria-label={t('pp.openPhoto', { what: t(KIND_KEY[p.kind] ?? 'sell.photo.detail') })} style={{ width: 64, height: 64, padding: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--sunken)', cursor: 'zoom-in' }}>
            {thumbs(asPhoto(p)) && <img src={thumbs(asPhoto(p))} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          </button>
        ))}
      </div>
      <Dialog open={current !== null} onClose={() => setOpen(null)} title={t('pp.sellerPhotos')} width={720}>
        {current && (
          <div>
            <div style={{ aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', background: 'var(--sunken)', display: 'grid', placeItems: 'center' }}>
              {full(asPhoto(current)) && <img src={full(asPhoto(current))} alt={t(KIND_KEY[current.kind] ?? 'sell.photo.detail')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {photos.map((p, i) => (
                <button key={p.path} type="button" className="chip" aria-pressed={i === open} onClick={() => setOpen(i)}>
                  {t(KIND_KEY[p.kind] ?? 'sell.photo.detail')}
                </button>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
