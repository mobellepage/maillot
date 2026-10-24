// The members you blocked: their content is hidden for you everywhere the
// app lists other members (feed, comments, messages, collectors); the
// database refuses comments, inquiries and follows between you.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';

const NONE = new Set<string>();

export function useBlocks() {
  const { user } = useSession();
  const uid = user?.id;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['blocks', uid], enabled: !!uid, queryFn: db.loadMyBlocks, staleTime: 5 * 60_000 });
  const handles = q.data ? new Set(q.data.map((b) => b.handle.toLowerCase())) : NONE;
  // A block changes what many lists show: refetch the lot.
  const after = () => qc.invalidateQueries();
  const block = useMutation({ mutationFn: db.blockUser, onSuccess: after });
  const unblock = useMutation({ mutationFn: db.unblockUser, onSuccess: after });
  return {
    list: q.data ?? [],
    isBlocked: (handle: string | null | undefined) => !!handle && handles.has(handle.toLowerCase()),
    /** Keeps only what isn't from a blocked member. */
    visible: <T,>(xs: T[], handleOf: (x: T) => string | null | undefined): T[] => (handles.size ? xs.filter((x) => !handles.has((handleOf(x) ?? '').toLowerCase())) : xs),
    block,
    unblock
  };
}
