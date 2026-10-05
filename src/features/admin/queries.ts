// Admin-only server state. Every RPC re-checks is_admin server-side; these
// hooks only run when the session says the user is an admin.
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';

export function useReviewQueue() {
  const { isAdmin } = useSession();
  const q = useQuery({ queryKey: ['reviewQueue'], enabled: isAdmin, queryFn: db.loadReviewQueue, refetchInterval: 20_000 });
  // An admin opening the queue is the real signal that a human is now
  // looking: flip brand-new requests to in_review (once per session).
  const marked = useRef(new Set<string>());
  useEffect(() => {
    const fresh = (q.data ?? []).filter((r) => r.status === 'pending' && !marked.current.has(r.id));
    fresh.forEach((r) => {
      marked.current.add(r.id);
      db.markInReview(r.id).catch(() => {});
    });
  }, [q.data]);
  return q;
}

export function useResolveReview() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) => db.resolveReview(id, approved, reason),
    onSuccess: (_d, { approved }) => toast(approved ? 'Verified' : 'Rejected'),
    onError: (e) => toast('Error: ' + (e as Error).message),
    onSettled: () => qc.invalidateQueries({ queryKey: ['reviewQueue'] })
  });
}

export function useAdminDisputes() {
  const { isAdmin } = useSession();
  return useQuery({ queryKey: ['adminDisputes'], enabled: isAdmin, queryFn: db.loadDisputesForAdmin, refetchInterval: 20_000 });
}

export function useResolveDispute() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, outcome, note }: { id: string; outcome: 'release' | 'refund'; note: string }) => db.resolveDispute(id, outcome, note),
    onSuccess: () => toast('Dispute resolved'),
    onError: (e) => toast('Error: ' + (e as Error).message),
    onSettled: () => qc.invalidateQueries({ queryKey: ['adminDisputes'] })
  });
}

export function useApiKeys() {
  const { isAdmin } = useSession();
  return useQuery({ queryKey: ['apiKeys'], enabled: isAdmin, queryFn: db.loadApiKeys });
}

export function useApiKeyActions() {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => qc.invalidateQueries({ queryKey: ['apiKeys'] });
  return {
    create: useMutation({ mutationFn: (label: string) => db.createApiKey(label || 'API key'), onSettled: refresh, onError: (e) => toast('Error: ' + (e as Error).message) }),
    revoke: useMutation({ mutationFn: (id: string) => db.revokeApiKey(id), onSettled: refresh, onError: (e) => toast('Error: ' + (e as Error).message) })
  };
}
