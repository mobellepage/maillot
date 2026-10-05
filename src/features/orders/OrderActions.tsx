// What the viewer can do with an order right now, with the dialogs those
// actions need. Used by the orders list and the order page, so both always
// offer exactly the same actions.
import { useState } from 'react';
import { usePrefs } from '../../lib/prefs.tsx';
import type { Order } from '../../utils/db.ts';
import { Button, useConfirm } from '../../ui/index.ts';
import { DisputeDialog, ReleaseDialog, ShipDialog } from './OrderDialogs.tsx';
import { useOrderActions } from './useOrders.ts';

export function OrderActions({ order: o, isBuyer }: { order: Order; isBuyer: boolean }) {
  const { t, money } = usePrefs();
  const act = useOrderActions();
  const confirm = useConfirm();
  const [open, setOpen] = useState<'ship' | 'release' | 'dispute' | null>(null);
  const close = () => setOpen(null);
  const status = o.status;

  const cancel = async () => {
    const ok = await confirm({ title: t('ord.cancelTitle'), body: t('ord.cancelBody'), confirmLabel: t('ord.cancelConfirm'), cancelLabel: t('ord.keep'), tone: 'danger' });
    if (ok) act.cancel.mutate(o.id);
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {isBuyer && status === 'pending_payment' && (
        <>
          <Button size="sm" busy={act.pay.isPending} busyLabel={t('ord.opening')} onClick={() => act.pay.mutate(o.id)}>
            {t('order.action.payNow')}
          </Button>
          <Button size="sm" variant="danger" busy={act.cancel.isPending} onClick={cancel}>
            {t('order.action.cancel')}
          </Button>
        </>
      )}
      {!isBuyer && status === 'paid_escrow' && (
        <Button size="sm" onClick={() => setOpen('ship')}>
          {t('order.action.markShipped')}
        </Button>
      )}
      {isBuyer && status === 'shipped' && o.inspection === 'passed' && (
        <Button size="sm" onClick={() => setOpen('release')}>
          {t('order.action.confirmRelease')}
        </Button>
      )}
      {(status === 'paid_escrow' || status === 'shipped') && (
        <Button size="sm" variant="ghost" onClick={() => setOpen('dispute')}>
          {t('order.action.dispute')}
        </Button>
      )}
      {open === 'ship' && (
        <ShipDialog orderId={o.id} onClose={close} busy={act.ship.isPending} onSubmit={(tracking, carrier) => act.ship.mutate({ id: o.id, tracking, carrier }, { onSuccess: close })} />
      )}
      <ReleaseDialog open={open === 'release'} onClose={close} busy={act.release.isPending} amountFmt={money(Number(o.amount))} onConfirm={() => act.release.mutate(o.id, { onSuccess: close })} />
      {open === 'dispute' && <DisputeDialog open onClose={close} busy={act.dispute.isPending} onSubmit={(reason) => act.dispute.mutate({ id: o.id, reason }, { onSuccess: close })} />}
    </div>
  );
}
