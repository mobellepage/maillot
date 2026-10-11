// Watchlist for signed-in users (Supabase) and guests (this browser only).
// When a guest signs in, their hearts are merged into the account.
import { useEffect, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import { useSession } from '../../lib/session.tsx';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';

const GUEST_KEY = 'kv_guest_watch';

// Guests' hearts live in this browser. One shared store, so the header's
// count, the feed and every heart button agree.
let guestIds: string[] | null = null;
const listeners = new Set<() => void>();
const NONE: string[] = [];
const readGuest = () => (guestIds ??= loadJSON<string[]>(GUEST_KEY, []));
const subscribeGuest = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
function setGuest(next: string[]) {
  guestIds = next;
  saveJSON(GUEST_KEY, next);
  listeners.forEach((l) => l());
}

export function useWatchlist() {
  const { user } = useSession();
  const uid = user?.id;
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = usePrefs();
  const guest = useSyncExternalStore(subscribeGuest, readGuest, () => NONE);

  const q = useQuery({ queryKey: ['watchlist', uid], enabled: !!uid, queryFn: () => db.loadWatchlist(uid!) });

  // Merge guest hearts into the account once, right after sign-in.
  useEffect(() => {
    if (!uid || !guest.length) return;
    const pending = guest;
    // Emptied first, so the other mounted hooks don't merge the same hearts again.
    setGuest([]);
    Promise.all(pending.map((id) => db.addWatch(uid, id).catch(() => {}))).then(() => {
      qc.invalidateQueries({ queryKey: ['watchlist', uid] });
    });
  }, [uid, guest, qc]);

  const toggle = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      if (!uid) return;
      if (on) await db.addWatch(uid, id);
      else await db.removeWatch(uid, id);
      db.logEvent(uid, id, on ? 'watch' : 'unwatch').catch(() => {});
    },
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: ['watchlist', uid] });
      const prev = qc.getQueryData<string[]>(['watchlist', uid]);
      qc.setQueryData<string[]>(['watchlist', uid], (xs = []) => (on ? [...new Set([...xs, id])] : xs.filter((x) => x !== id)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(['watchlist', uid], ctx?.prev);
      toast(t('watch.failed'));
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: ['watchlist', uid] });
      qc.invalidateQueries({ queryKey: ['shirtStats', id] });
    }
  });

  const ids: string[] = uid ? q.data ?? [] : guest;

  return {
    ids,
    has: (id: string) => ids.includes(id),
    /** quiet: no toast (the feed shows its own feedback for every swipe). */
    toggle: (id: string, opts?: { quiet?: boolean }) => {
      const on = !ids.includes(id);
      if (!opts?.quiet) toast(on ? t('watch.added') : t('watch.removed'));
      if (uid) toggle.mutate({ id, on });
      else {
        setGuest(on ? [...guest, id] : guest.filter((x) => x !== id));
      }
    }
  };
}
