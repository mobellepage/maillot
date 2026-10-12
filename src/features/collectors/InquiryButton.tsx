// "Ask anyway" on a collector's piece (shown as not for sale): a
// non-binding inquiry, optionally with a price. Not an offer — the owner
// can answer, ignore it or open the shirt to offers.
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, Dialog, TextField } from '../../ui/index.ts';

export function InquiryButton({ itemId, name, owner }: { itemId: string; name: string; owner: string }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const { pathname } = useLocation();
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const send = useMutation({
    mutationFn: () => db.makeInquiry(itemId, amount ? Number(amount) : null, message),
    onSuccess: () => {
      setOpen(false);
      toast(t('inq.sent', { handle: '@' + owner }));
      qc.invalidateQueries({ queryKey: ['myInquiries'] });
    },
    onError: (e) => {
      const code = (e as { code?: string }).code;
      toast(code === '23505' ? t('inq.already') : code === 'P0429' ? t('offer.limited') : t('toast.actionFailed'));
    }
  });
  const btn = { position: 'relative', zIndex: 2, marginTop: 10 } as const;
  if (!user)
    return (
      <Link to="/signin" state={{ from: pathname, notice: 'offer.signIn' }} className="btn btn--ghost btn--sm" style={btn}>
        {t('inq.cta')}
      </Link>
    );
  return (
    <>
      <Button size="sm" variant="ghost" style={btn} onClick={() => setOpen(true)}>
        {t('inq.cta')}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('inq.title')}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 16px' }}>{t('inq.body', { name, handle: '@' + owner })}</p>
        <TextField label={t('inq.message')} autoFocus value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} placeholder={t('inq.messagePlaceholder')} />
        <div style={{ height: 12 }} />
        <TextField label={t('inq.amount')} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} adornment={<span className="mono">CHF</span>} />
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '12px 0 0', lineHeight: 1.45 }}>{t('inq.how')}</p>
        <Button block style={{ marginTop: 16 }} disabled={!message.trim() && !amount} busy={send.isPending} onClick={() => send.mutate()}>
          {t('inq.send')}
        </Button>
      </Dialog>
    </>
  );
}
