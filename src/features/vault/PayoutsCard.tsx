// Seller payout setup (Stripe Connect Express). Sales can be listed before
// this is done; payouts for released orders wait until onboarding completes
// and are then sent automatically.
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePayoutStatus } from './usePayoutStatus.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Badge, Button, Card } from '../../ui/index.ts';

export function PayoutsCard() {
  const status = usePayoutStatus();
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = usePrefs();
  const [params, setParams] = useSearchParams();
  const ready = !!status.data?.payouts_enabled;
  const connected = !!status.data?.connected;

  // Back from Stripe-hosted onboarding.
  useEffect(() => {
    const p = params.get('payouts');
    if (!p) return;
    toast(p === 'done' ? t('pay.done') : t('pay.retry'));
    qc.invalidateQueries({ queryKey: ['payoutStatus'] });
    setParams({}, { replace: true });
  }, [params, setParams, toast, qc, t]);

  const start = useMutation({
    mutationFn: db.startPayoutOnboarding,
    onSuccess: (r) => {
      if (!r.configured) toast(t('pay.off'));
      else if (r.url) window.location.href = r.url;
      else toast(t('pay.failed'));
    },
    onError: () => toast(t('pay.failed'))
  });

  if (status.isLoading) return null;
  return (
    <Card style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
      <div style={{ flex: '1 1 320px' }}>
        <h2 className="title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {t('pay.title')}
          <Badge tone={ready ? 'accent' : connected ? 'warn' : 'neutral'}>{ready ? t('pay.active') : connected ? t('pay.pending') : t('pay.notSetUp')}</Badge>
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-2)' }}>
          {ready
            ? t('pay.readyBody')
            : t('pay.setupBody')}
        </p>
      </div>
      <Button variant={ready ? 'ghost' : 'primary'} size="sm" busy={start.isPending} busyLabel={t('pay.opening')} onClick={() => start.mutate()}>
        {ready ? t('pay.dashboard') : connected ? t('pay.continue') : t('pay.setup')}
      </Button>
    </Card>
  );
}
