// "Choose a profile picture": the 100 legends in a grid, plus initials. Saves
// straight away and refreshes everywhere the member's picture shows.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Dialog } from '../../ui/index.ts';
import { Avatar } from './Avatar.tsx';
import { LEGENDS } from './legends.ts';

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
      <p style={{ margin: '0 0 14px', color: 'var(--text-2)', fontSize: 14.5 }}>{t('avatar.body')}</p>
      <div role="group" aria-label={t('avatar.title')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(70px,1fr))', gap: 6, maxHeight: '60vh', overflowY: 'auto', padding: 2 }}>
        {option(null, t('avatar.initials'))}
        {LEGENDS.map((l, i) => option(l.id, t('avatar.legend', { n: i + 1 })))}
      </div>
    </Dialog>
  );
}
