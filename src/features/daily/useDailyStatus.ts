// Today's puzzle at a glance (home page): its number, whether it's played
// and how, and the current streak — from this browser and, for members,
// from the results saved on other devices.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../lib/session.tsx';
import { loadJSON } from '../../utils/storage.ts';
import * as db from '../../utils/db.ts';
import { RESULTS_KEY, dayKey, puzzleNumber, stats, type DayResult } from './game.ts';

export function useDailyStatus() {
  const { user } = useSession();
  const [today] = useState(() => dayKey());
  const [local] = useState<DayResult[]>(() => loadJSON<DayResult[]>(RESULTS_KEY, []));
  const remote = useQuery({ queryKey: ['dailyResults', user?.id], queryFn: db.loadDailyResults, enabled: !!user, staleTime: 60_000 });
  return useMemo(() => {
    const m = new Map<string, DayResult>();
    for (const r of [...(remote.data ?? []), ...local]) m.set(r.day, r);
    const results = [...m.values()];
    return { n: puzzleNumber(today), played: m.get(today) ?? null, streak: stats(results, today).current };
  }, [remote.data, local, today]);
}
