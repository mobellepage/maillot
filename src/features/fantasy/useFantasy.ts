// The player's state and actions (packs, duplicates, missions), cached for
// the page and the home tile; actions refresh it.
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import type { FantasyMission } from '../../utils/db.ts';

export function useFantasy() {
  const { user } = useSession();
  const qc = useQueryClient();
  const state = useQuery({ queryKey: ['fantasy', user?.id], queryFn: db.loadFantasyState, enabled: !!user, staleTime: 30_000, retry: false });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['fantasy', user?.id] });
    void qc.invalidateQueries({ queryKey: ['fantasyCards', user?.id] });
  };
  const open = useMutation({ mutationFn: (extra: boolean) => db.openFantasyPack(extra), onSettled: refresh });
  const convert = useMutation({ mutationFn: (kitId?: string) => db.convertFantasyDuplicates(kitId), onSettled: refresh });
  const missions = ((state.data?.missions as FantasyMission[] | undefined) ?? []).filter((m) => m && typeof m.key === 'string');
  const cardsByRarity = (state.data?.cards as Record<string, number> | undefined) ?? {};
  return { user, state, missions, cardsByRarity, open, convert, refresh };
}

/**
 * Tells the game the member did something a mission may ask for (opened a
 * shirt's value, a club page, the market). Once per page view; the server
 * ignores what isn't one of today's missions.
 */
export function useFantasyEvent(key: 'check_value' | 'view_library' | 'visit_market', ready = true) {
  const { user } = useSession();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user || !ready) return;
    db.fantasyEvent(key)
      .then((pts) => {
        if (pts > 0) void qc.invalidateQueries({ queryKey: ['fantasy', user.id] });
      })
      .catch(() => {});
  }, [user, ready, key, qc]);
}
