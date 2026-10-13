// Picking and uploading order photos (shipping / receipt). The photos go to
// the uploader's own vault-photos folder under orders/<order id>/.
import { useState } from 'react';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { analyzeAndCompress, type CompressedPhoto } from '../../utils/image.ts';

/** [kind, label key, required] */
export type Slot = readonly [string, string, boolean];

export function usePhotoSlots(slots: readonly Slot[]) {
  const toast = useToast();
  const { t } = usePrefs();
  const [photos, setPhotos] = useState<Record<string, CompressedPhoto>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const add = async (kind: string, file: File) => {
    setBusy(kind);
    try {
      const p = await analyzeAndCompress(file, { maxDim: 1600 });
      setPhotos((x) => ({ ...x, [kind]: p }));
    } catch {
      toast(t('sell.photoFailed'));
    } finally {
      setBusy(null);
    }
  };
  const complete = slots.every(([kind, , required]) => !required || !!photos[kind]);
  return { slots, photos, busy, add, complete };
}
export type PhotoSlots = ReturnType<typeof usePhotoSlots>;

/** Uploads the picked photos in slot order: [{path, thumbPath}]. */
export async function uploadOrderPhotos(userId: string, orderId: string, s: PhotoSlots): Promise<db.OrderPhoto[]> {
  const out: db.OrderPhoto[] = [];
  for (const [kind] of s.slots) {
    const p = s.photos[kind];
    if (p) out.push(await db.uploadPhoto(userId, 'orders/' + orderId, kind, p.blob, p.thumb));
  }
  return out;
}
