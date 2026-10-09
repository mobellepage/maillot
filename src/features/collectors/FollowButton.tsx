// Follow / unfollow a collector from their profile. Visitors are sent to
// sign in and come back here; on your own profile it links to the settings.
import { useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { CollectorStats } from '../../utils/db.ts';
import { Button, ButtonLink } from '../../ui/index.ts';

export function FollowButton({ handle, stats }: { handle: string; stats: CollectorStats | undefined }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const key = ['collectorStats', handle.toLowerCase(), user?.id];

  const toggle = useMutation({
    mutationFn: (follow: boolean) => db.setFollowing(handle, follow),
    // Flip at once; the server's answer settles it.
    onMutate: async (follow) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<CollectorStats | null>(key);
      if (before) qc.setQueryData(key, { ...before, is_following: follow, followers: before.followers + (follow ? 1 : -1) });
      return { before };
    },
    onError: (e, _follow, ctx) => {
      qc.setQueryData(key, ctx?.before);
      toast((e as { code?: string }).code === 'P0429' ? t('coll.followLimited') : t('coll.followFailed'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['myFollowing'] });
    }
  });

  if (!user)
    return (
      <ButtonLink to="/signin" state={{ from: pathname, notice: 'coll.signInToFollow' }} size="sm">
        {t('coll.follow')}
      </ButtonLink>
    );
  if (!stats) return null;
  if (stats.is_me)
    return (
      <ButtonLink to="/account" variant="secondary" size="sm">
        {t('coll.editProfile')}
      </ButtonLink>
    );
  return (
    <Button size="sm" variant={stats.is_following ? 'secondary' : 'primary'} aria-pressed={stats.is_following} disabled={toggle.isPending} onClick={() => toggle.mutate(!stats.is_following)}>
      {stats.is_following ? t('coll.following') : t('coll.follow')}
    </Button>
  );
}
