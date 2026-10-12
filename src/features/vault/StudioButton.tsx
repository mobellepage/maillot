// "Create studio look" for a shirt already in the collection: its front photo
// is cut out (studio-photo edge function), placed on a transparent square and
// saved as the shirt's main picture. The original front photo stays.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import type { CustomItem } from '../../types/domain.ts';
import * as db from '../../utils/db.ts';
import { cutoutShirt } from '../../utils/db/studio.ts';
import { Button } from '../../ui/index.ts';
import { composeStudio } from './addshirt/studio.ts';

/** The stored photo as a JPEG data URL (≤1600 px), which the cut-out service takes. */
async function asJpeg(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

export function StudioButton({ item, frontUrl }: { item: CustomItem; frontUrl: string | undefined }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const make = useMutation({
    mutationFn: async () => {
      const r = await cutoutShirt(await asJpeg(frontUrl!));
      if (!r.ok) return r.reason;
      const { blob, thumb } = await composeStudio(r.png);
      const { path, thumbPath } = await db.uploadPhoto(user!.id, 'items/' + item.id, 'front_studio', blob, thumb);
      await db.upsertCustomItem(user!.id, { ...item, photos: { ...item.photos, front_studio: { path, thumbPath, label: t('as.photo.studio'), width: 1200, height: 1200 } }, updatedAt: Date.now() });
      return 'done' as const;
    },
    onSuccess: (r) => {
      if (r === 'done') {
        qc.invalidateQueries({ queryKey: ['customItems', user?.id] });
        toast(t('vault.studioDone'));
      } else toast(t(r === 'off' ? 'as.studio.off' : r === 'rate_limited' ? 'as.studio.limited' : 'as.studio.failed'));
    },
    onError: () => toast(t('as.studio.failed'))
  });
  if (!user || !frontUrl || item.photos?.front_studio) return null;
  return (
    <Button variant="secondary" size="sm" busy={make.isPending} busyLabel={t('as.studio.working')} onClick={() => make.mutate()} style={{ marginTop: 12 }}>
      {t('vault.studioMake')}
    </Button>
  );
}
