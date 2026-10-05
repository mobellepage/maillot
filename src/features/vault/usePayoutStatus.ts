import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';

export function usePayoutStatus() {
  const { user } = useSession();
  return useQuery({ queryKey: ['payoutStatus', user?.id], enabled: !!user, queryFn: db.loadPayoutStatus });
}
