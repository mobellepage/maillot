// Admin-only server state. Every RPC re-checks is_admin server-side; these
// hooks only run when the session says the user is an admin.
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { useLive } from '../../lib/realtime.ts';

export function useReviewQueue() {
  const { isAdmin } = useSession();
  const q = useQuery({ queryKey: ['reviewQueue'], enabled: isAdmin, queryFn: db.loadReviewQueue });
  useLive([{ table: 'review_queue' }], [['reviewQueue']], isAdmin);
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
  useLive([{ table: 'disputes' }, { table: 'orders' }], [['adminDisputes']], isAdmin);
  return useQuery({ queryKey: ['adminDisputes'], enabled: isAdmin, queryFn: db.loadDisputesForAdmin });
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

export function useInspections() {
  const { isAdmin } = useSession();
  useLive([{ table: 'orders' }], [['inspections']], isAdmin);
  return useQuery({ queryKey: ['inspections'], enabled: isAdmin, queryFn: db.loadInspections });
}

export function useRecordInspection() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, passed, note, outbound, carrier }: { id: string; passed: boolean; note: string; outbound: string; carrier: string | null }) => db.recordInspection(id, passed, note, outbound, carrier),
    onSuccess: (_d, { passed }) => toast(passed ? 'Passed — buyer notified' : 'Failed — buyer refunded'),
    onError: (e) => toast('Error: ' + (e as Error).message),
    onSettled: () => qc.invalidateQueries({ queryKey: ['inspections'] })
  });
}

export function useOutboundLabel() {
  const toast = useToast();
  return useMutation({
    mutationFn: (orderId: string) => db.requestShippingLabel(orderId, 'outbound'),
    onSuccess: (r) => {
      if (!r.configured) toast(r.message || 'Prepaid labels aren’t switched on.');
      else if (r.url) window.open(r.url, '_blank', 'noopener');
      else toast(r.error || 'Couldn’t create the label.');
    },
    onError: (e) => toast('Error: ' + (e as Error).message)
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
