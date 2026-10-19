// The signed-in member's plan and this month's AI scans (public.my_plan).
// Refetched after every scan, so the counter in the add-shirt flow is current.
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../lib/session.tsx';
import { loadMyPlan } from '../../utils/db.ts';

export const planKey = (uid: string | undefined) => ['my-plan', uid] as const;

export function usePlan() {
  const { user } = useSession();
  return useQuery({ queryKey: planKey(user?.id), enabled: !!user, queryFn: loadMyPlan, staleTime: 30_000 }).data ?? null;
}

/** Whole days left until then (at least 1 while it hasn't passed). */
export const daysLeft = (until: string | null): number => (until ? Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000)) : 0);
