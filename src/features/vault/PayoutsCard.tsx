// Seller payout setup (Stripe Connect Express). Sales can be listed before
// this is done; payouts for released orders wait until onboarding completes
// and are then sent automatically.
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePayoutStatus } from './usePayoutStatus.ts';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Badge, Button, Card } from '../../ui/index.ts';

export function PayoutsCard() {
  const status = usePayoutStatus();
  const qc = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const ready = !!status.data?.payouts_enabled;
  const connected = !!status.data?.connected;

  // Back from Stripe-hosted onboarding.
  useEffect(() => {
    const p = params.get('payouts');
    if (!p) return;
    toast(p === 'done' ? 'Thanks — Stripe is verifying your details. Payouts switch on automatically.' : 'Onboarding wasn’t finished — you can continue any time.');
    qc.invalidateQueries({ queryKey: ['payoutStatus'] });
    setParams({}, { replace: true });
  }, [params, setParams, toast, qc]);

  const start = useMutation({
    mutationFn: db.startPayoutOnboarding,
    onSuccess: (r) => {
      if (!r.configured) toast(r.message || 'Payouts aren’t switched on yet.');
      else if (r.url) window.location.href = r.url;
      else toast(r.error || 'Couldn’t start payout setup.');
    },
    onError: () => toast('Couldn’t start payout setup — please try again.')
  });

  if (status.isLoading) return null;
  return (
    <Card style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
      <div style={{ flex: '1 1 320px' }}>
        <h2 className="title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          Payouts
          <Badge tone={ready ? 'accent' : connected ? 'warn' : 'neutral'}>{ready ? 'Active' : connected ? 'Verification pending' : 'Not set up'}</Badge>
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-2)' }}>
          {ready
            ? 'Sales are paid to your bank account via Stripe once the buyer confirms delivery.'
            : 'Connect a bank account through Stripe so we can pay you when a shirt sells. You can list now — payouts wait until this is done.'}
        </p>
      </div>
      <Button variant={ready ? 'ghost' : 'primary'} size="sm" busy={start.isPending} busyLabel="Opening Stripe…" onClick={() => start.mutate()}>
        {ready ? 'Payout dashboard' : connected ? 'Continue setup' : 'Set up payouts'}
      </Button>
    </Card>
  );
}
