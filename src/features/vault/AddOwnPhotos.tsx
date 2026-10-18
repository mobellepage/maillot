// On a shirt added without photos: take or pick your own front and back.
// They are compressed on the device (EXIF/GPS stripped), saved to private
// storage and replace the library picture — the shirt stops looking greyed
// out in the collection. PhotoSlots is the same picker for any set of photos
// (the shirt page uses it for the ones selling needs).
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { CustomItem } from '../../types/domain.ts';
import * as db from '../../utils/db.ts';
import { analyzeAndCompress } from '../../utils/image.ts';

const stamp = () => Date.now();

const ICONS: Record<string, string> = { front: '👕', back: '🔢', crest: '🛡️', flock_closeup: '🔤', product_code: '🏷️' };

export function AddOwnPhotos({ item }: { item: CustomItem }) {
  const { t } = usePrefs();
  const { user } = useSession();
  if (!user || item.photos?.front) return null;
  return (
    <section aria-labelledby="ownphotos-title" className="card own-photos">
      <h2 id="ownphotos-title" style={{ margin: 0, fontSize: 16 }}>
        📷 {t('ownphotos.title')}
      </h2>
      <p style={{ margin: '4px 0 12px', fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.45 }}>{t('ownphotos.body')}</p>
      <PhotoSlots item={item} keys={['front', 'back']} />
    </section>
  );
}

export function PhotoSlots({ item, keys }: { item: CustomItem; keys: string[] }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  if (!user) return null;

  const take = async (key: string, label: string, file: File) => {
    setBusy(key);
    try {
      const { blob, thumb, width, height, lowRes, blurry, tooDark, tooBright } = await analyzeAndCompress(file);
      const { path, thumbPath } = await db.uploadPhoto(user.id, 'items/' + item.id, key, blob, thumb);
      await db.upsertCustomItem(user.id, { ...item, photos: { ...item.photos, [key]: { path, thumbPath, label, width, height, lowRes, blurry, tooDark, tooBright } }, updatedAt: stamp() });
      await qc.invalidateQueries({ queryKey: ['customItems', user.id] });
      toast(t('ownphotos.saved'));
    } catch {
      toast(t('as.uploadFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {keys.map((key) => {
          const s = { key, label: 'as.photo.' + key, icon: ICONS[key] ?? '📷' };
          const has = !!item.photos?.[s.key];
          return (
            <button key={s.key} type="button" className="own-photos-slot" aria-pressed={has} disabled={busy !== null} onClick={() => inputs.current[s.key]?.click()}>
              <span aria-hidden="true" style={{ fontSize: 22 }}>
                {has ? '✓' : s.icon}
              </span>
              <span>{busy === s.key ? t('ownphotos.saving') : t(s.label)}</span>
              <input
                ref={(el) => {
                  inputs.current[s.key] = el;
                }}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void take(s.key, t(s.label), file);
                }}
              />
            </button>
          );
        })}
      </div>
  );
}
