// "Tell me when it's listed": an alert for this shirt in the chosen size (or
// any size), optionally up to a price. Shown under the buy/bid buttons.
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMyAlerts } from '../../watchlist/useMyAlerts.ts';
import type { Shirt } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { useSession } from '../../../lib/session.tsx';
import { useToast } from '../../../lib/toast.tsx';
import * as db from '../../../utils/db.ts';
import { Button, Dialog, TextField } from '../../../ui/index.ts';

export function AlertButton({ s, size }: { s: Shirt; size: string }) {
  const { t, money } = usePrefs();
  const { user } = useSession();
  const { pathname, search } = useLocation();
  const toast = useToast();
  const qc = useQueryClient();
  const alerts = useMyAlerts();
  const [open, setOpen] = useState(false);
  const [anySize, setAnySize] = useState(false);
  const [max, setMax] = useState('');
  const current = (alerts.data ?? []).find((a) => a.shirt_id === s.id && (a.size === size || a.size === null));
  const done = () => qc.invalidateQueries({ queryKey: ['alerts', user?.id] });
  const save = useMutation({
    mutationFn: () => db.setAlert(user!.id, s.id, anySize ? null : size, max ? Number(max) : null),
    onSuccess: () => {
      setOpen(false);
      toast(t('alert.saved'));
      done();
    },
    onError: () => toast(t('toast.actionFailed'))
  });
  const remove = useMutation({ mutationFn: (id: string) => db.removeAlert(id), onSuccess: done, onError: () => toast(t('toast.actionFailed')) });

  const row = { marginTop: 12, fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } as const;
  if (!user)
    return (
      <div style={row}>
        <span aria-hidden="true">🔔</span>
        <Link to="/signin" state={{ from: pathname + search, notice: 'alert.signIn' }}>
          {t('alert.cta')}
        </Link>
      </div>
    );
  if (current)
    return (
      <div style={row}>
        <span aria-hidden="true">🔔</span>
        <span>
          {t('alert.active', { size: current.size ?? t('alert.anySize') })}
          {current.max_price !== null && ' · ' + t('alert.upTo', { price: money(Number(current.max_price)) })}
        </span>
        <button type="button" className="link-btn" onClick={() => remove.mutate(current.id)} disabled={remove.isPending}>
          {t('alert.remove')}
        </button>
      </div>
    );
  return (
    <>
      <div style={row}>
        <span aria-hidden="true">🔔</span>
        <button type="button" className="link-btn" onClick={() => setOpen(true)}>
          {t('alert.cta')}
        </button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('alert.title')}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 16px' }}>{t('alert.body', { name: s.name })}</p>
        <div className="segmented" style={{ marginBottom: 16 }}>
          <button type="button" aria-pressed={!anySize} onClick={() => setAnySize(false)}>
            {t('alert.thisSize', { size })}
          </button>
          <button type="button" aria-pressed={anySize} onClick={() => setAnySize(true)}>
            {t('alert.anySize')}
          </button>
        </div>
        <TextField
          label={t('alert.maxPrice')}
          inputMode="numeric"
          value={max}
          onChange={(e) => setMax(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder={t('alert.anyPrice')}
          adornment={<span className="mono">CHF</span>}
        />
        <Button block style={{ marginTop: 18 }} busy={save.isPending} onClick={() => save.mutate()}>
          {t('alert.save')}
        </Button>
      </Dialog>
    </>
  );
}
