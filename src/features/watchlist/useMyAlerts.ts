// The signed-in member's listing alerts (shared by the product page and the watchlist).
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';

export function useMyAlerts() {
  const { user } = useSession();
  return useQuery({ queryKey: ['alerts', user?.id], queryFn: db.loadMyAlerts, enabled: !!user });
}
