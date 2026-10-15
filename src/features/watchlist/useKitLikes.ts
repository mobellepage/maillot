// Likes on library kits (the feed's right swipe on a kit): kept with the
// account for members, in this browser for guests — merged into the
// account at sign-in, like the watchlist of catalogue shirts.
import { useEffect, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import type { FeedKit } from '../../utils/db.ts';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import { useSession } from '../../lib/session.tsx';

const GUEST_KEY = 'kv_guest_kit_likes';

let guestKits: FeedKit[] | null = null;
const listeners = new Set<() => void>();
const NONE: FeedKit[] = [];
const readGuest = () => (guestKits ??= loadJSON<FeedKit[]>(GUEST_KEY, []));
const subscribeGuest = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
function setGuest(next: FeedKit[]) {
  guestKits = next;
  saveJSON(GUEST_KEY, next);
  listeners.forEach((l) => l());
}

export function useKitLikes() {
  const { user } = useSession();
  const uid = user?.id;
  const qc = useQueryClient();
  const guest = useSyncExternalStore(subscribeGuest, readGuest, () => NONE);
  const q = useQuery({ queryKey: ['kitLikes', uid], enabled: !!uid, queryFn: db.loadLikedKits, retry: false });

  // A guest's likes go into the account once, right after sign-in.
  useEffect(() => {
    if (!uid || !guest.length) return;
    const pending = guest;
    setGuest([]);
    Promise.all(pending.map((k) => db.likeKit(k.id).catch(() => {}))).then(() => qc.invalidateQueries({ queryKey: ['kitLikes', uid] }));
  }, [uid, guest, qc]);

  const toggle = useMutation({
    mutationFn: async ({ kit, on }: { kit: FeedKit; on: boolean }) => (on ? db.likeKit(kit.id) : db.unlikeKit(kit.id)),
    onMutate: async ({ kit, on }) => {
      await qc.cancelQueries({ queryKey: ['kitLikes', uid] });
      const prev = qc.getQueryData<FeedKit[]>(['kitLikes', uid]);
      qc.setQueryData<FeedKit[]>(['kitLikes', uid], (xs = []) => (on ? [kit, ...xs.filter((x) => x.id !== kit.id)] : xs.filter((x) => x.id !== kit.id)));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['kitLikes', uid], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['kitLikes', uid] })
  });

  const kits: FeedKit[] = uid ? q.data ?? [] : guest;
  return {
    kits,
    has: (id: string) => kits.some((k) => k.id === id),
    toggle: (kit: FeedKit) => {
      const on = !kits.some((k) => k.id === kit.id);
      if (uid) toggle.mutate({ kit, on });
      else setGuest(on ? [kit, ...guest] : guest.filter((k) => k.id !== kit.id));
    }
  };
}
