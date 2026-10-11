// "Make an offer" on a collection shirt that's open to offers or for sale.
// The owner decides; if they accept, it becomes an order the buyer pays.
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, Dialog, TextField } from '../../ui/index.ts';

export function OfferButton({ itemId, name, owner, suggested }: { itemId: string; name: string; owner: string; suggested?: number | undefined }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const { pathname } = useLocation();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(suggested ? String(Math.round(suggested)) : '');
  const [message, setMessage] = useState('');
  const send = useMutation({
    mutationFn: () => db.makeOffer(itemId, Number(amount), message),
    onSuccess: () => {
      setOpen(false);
      toast(t('offer.sent', { handle: '@' + owner }));
      qc.invalidateQueries({ queryKey: ['myOffers'] });
    },
    onError: (e) => toast((e as { code?: string }).code === 'P0429' ? t('offer.limited') : t('toast.actionFailed'))
  });
  const btn = { position: 'relative', zIndex: 2, marginTop: 10 } as const;
  if (!user)
    return (
      <Link to="/signin" state={{ from: pathname, notice: 'offer.signIn' }} className="btn btn--secondary btn--sm" style={btn}>
        {t('offer.cta')}
      </Link>
    );
  return (
    <>
      <Button size="sm" variant="secondary" style={btn} onClick={() => setOpen(true)}>
        {t('offer.cta')}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('offer.title')}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 16px' }}>{t('offer.body', { name, handle: '@' + owner })}</p>
        <TextField label={t('offer.amount')} inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} adornment={<span className="mono">CHF</span>} />
        <div style={{ height: 12 }} />
        <TextField label={t('offer.message')} value={message} onChange={(e) => setMessage(e.target.value.slice(0, 300))} placeholder={t('offer.messagePlaceholder')} />
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '12px 0 0', lineHeight: 1.45 }}>{t('offer.how')}</p>
        <Button block style={{ marginTop: 16 }} disabled={!(Number(amount) >= 1)} busy={send.isPending} onClick={() => send.mutate()}>
          {t('offer.send')}
        </Button>
      </Dialog>
    </>
  );
}
