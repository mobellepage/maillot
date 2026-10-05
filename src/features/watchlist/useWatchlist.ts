// Watchlist for signed-in users (Supabase) and guests (this browser only).
// When a guest signs in, their hearts are merged into the account.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';

const GUEST_KEY = 'kv_guest_watch';

export function useWatchlist() {
  const { user } = useSession();
  const uid = user?.id;
  const qc = useQueryClient();
  const toast = useToast();
  const [guest, setGuest] = useState<string[]>(() => loadJSON<string[]>(GUEST_KEY, []));

  const q = useQuery({ queryKey: ['watchlist', uid], enabled: !!uid, queryFn: () => db.loadWatchlist(uid!) });

  // Merge guest hearts into the account once, right after sign-in.
  useEffect(() => {
    if (!uid || !guest.length) return;
    const pending = guest;
    saveJSON(GUEST_KEY, []);
    Promise.all(pending.map((id) => db.addWatch(uid, id).catch(() => {}))).then(() => {
      setGuest([]);
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
      toast('Couldn’t update your watchlist — please try again.');
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
    toggle: (id: string) => {
      const on = !ids.includes(id);
      toast(on ? 'Added to watchlist' : 'Removed from watchlist');
      if (uid) toggle.mutate({ id, on });
      else {
        const next = on ? [...guest, id] : guest.filter((x) => x !== id);
        setGuest(next);
        saveJSON(GUEST_KEY, next);
      }
    }
  };
}
