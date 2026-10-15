// Today's puzzle kit, the same for everyone (the server's schedule).
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { dayKey } from './game.ts';

export function useDailyKit() {
  const [today] = useState(() => dayKey());
  const q = useQuery({ queryKey: ['dailyKit', today], queryFn: () => db.loadDailyKit(today), staleTime: Infinity, retry: 1 });
  return { today, kit: q.data ?? null, loading: q.isLoading, error: q.isError, retry: () => q.refetch() };
}
