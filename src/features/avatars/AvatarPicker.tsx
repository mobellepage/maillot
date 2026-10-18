// "Choose a profile picture": your own photo (cropped square on the device,
// location data dropped), the 100 legends in a grid, or initials. Saves
// straight away and refreshes everywhere the member's picture shows.
import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, Dialog } from '../../ui/index.ts';
import { Avatar } from './Avatar.tsx';
import { LEGENDS } from './legends.ts';

/** A square 512 px JPEG from the middle of a photo (re-encoded: no EXIF/GPS). */
async function squareJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bmp.width, bmp.height);
  const size = Math.min(512, side);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('no picture'))), 'image/jpeg', 0.86));
}

export function AvatarPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = usePrefs();
  const { user, profile } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: (avatar: string | null) => db.setAvatar(user!.id, avatar),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] });
      qc.invalidateQueries({ queryKey: ['collectorStats'] });
      toast(t('avatar.saved'));
      onClose();
    },
    onError: () => toast(t('coll.saveFailed'))
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => db.uploadAvatarPhoto(user!.id, await squareJpeg(file)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] });
      qc.invalidateQueries({ queryKey: ['collectorStats'] });
      toast(t('avatar.saved'));
      onClose();
    },
    onError: () => toast(t('avatar.uploadFailed'))
  });
  if (!user) return null;
  const current = profile?.avatar ?? null;
  const name = profile?.handle || user.email || '?';
  const option = (id: string | null, label: string) => (
    <button
      key={id ?? 'initials'}
      type="button"
      aria-pressed={current === id}
      aria-label={label}
      disabled={save.isPending}
      onClick={() => save.mutate(id)}
      style={{ padding: 3, borderRadius: '50%', border: `3px solid ${current === id ? 'var(--accent-fill)' : 'transparent'}`, background: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
    >
      <Avatar avatar={id} name={name} size={60} ring={false} />
    </button>
  );
  return (
    <Dialog open={open} onClose={onClose} title={t('avatar.title')} width={620}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {current?.startsWith('photo:') && <Avatar avatar={current} name={name} size={60} ring />}
        <Button variant="secondary" size="sm" busy={upload.isPending} disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
          📷 {t('avatar.upload')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) upload.mutate(file);
          }}
        />
      </div>
      <p style={{ margin: '0 0 14px', color: 'var(--text-2)', fontSize: 14.5 }}>{t('avatar.body')}</p>
      <div role="group" aria-label={t('avatar.title')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(70px,1fr))', gap: 6, maxHeight: '60vh', overflowY: 'auto', padding: 2 }}>
        {option(null, t('avatar.initials'))}
        {LEGENDS.map((l, i) => option(l.id, t('avatar.legend', { n: i + 1 })))}
      </div>
    </Dialog>
  );
}
