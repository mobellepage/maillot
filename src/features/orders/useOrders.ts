// The signed-in user's orders (as buyer or seller) and the escrow actions.
// Every action is a server RPC that re-checks role + status (see db.ts).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { usePrefs } from '../../lib/prefs.tsx';
import { useLive } from '../../lib/realtime.ts';

export function useOrders(enabled = true) {
  const { user } = useSession();
  const on = enabled && !!user;
  useLive(
    [
      { table: 'orders', filter: 'buyer_id=eq.' + user?.id },
      { table: 'orders', filter: 'seller_id=eq.' + user?.id }
    ],
    [['orders', user?.id]],
    on
  );
  return useQuery({ queryKey: ['orders', user?.id], enabled: on, queryFn: () => db.loadMyOrders(user!.id) });
}

export function useOrderActions() {
  const { user } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = usePrefs();
  const key = ['orders', user?.id];
  const done = (msg: string) => () => {
    toast(t(msg));
    qc.invalidateQueries({ queryKey: key });
  };
  const fail = (msg: string) => () => toast(t(msg));

  return {
    pay: useMutation({
      mutationFn: (orderId: string) => db.createCheckoutSession(orderId),
      onSuccess: (res) => {
        if (!res.configured) toast(res.message || t('toast.paymentsNotConfigured'));
        else if (res.url) window.location.href = res.url;
        else toast(res.error || t('toast.paymentStartFailed'));
      },
      onError: fail('toast.paymentStartFailed')
    }),
    ship: useMutation({ mutationFn: ({ id, tracking }: { id: string; tracking: string }) => db.markOrderShipped(id, tracking), onSuccess: done('toast.markedShipped'), onError: fail('toast.actionFailed') }),
    release: useMutation({ mutationFn: (id: string) => db.confirmOrderReceipt(id), onSuccess: done('toast.releaseConfirmed'), onError: fail('toast.actionFailed') }),
    cancel: useMutation({ mutationFn: (id: string) => db.cancelOrder(id), onSuccess: done('toast.orderCancelled'), onError: fail('toast.cancelFailed') }),
    dispute: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => db.openDispute(id, reason), onSuccess: done('toast.disputeFiled'), onError: fail('toast.disputeFailed') })
  };
}
