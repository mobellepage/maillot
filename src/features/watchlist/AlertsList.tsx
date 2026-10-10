// The member's listing alerts, on the watchlist tab: which shirt, size and
// price limit — and a way to remove each.
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { Card } from '../../ui/index.ts';
import { useMyAlerts } from './useMyAlerts.ts';

export function AlertsList() {
  const { t, money } = usePrefs();
  const { user } = useSession();
  const qc = useQueryClient();
  const alerts = useMyAlerts();
  const remove = useMutation({ mutationFn: (id: string) => db.removeAlert(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', user?.id] }) });
  if (!alerts.data?.length) return null;
  return (
    <section aria-labelledby="alerts-title" style={{ marginBottom: 28 }}>
      <h2 id="alerts-title" className="title" style={{ fontSize: 17 }}>
        {t('alert.listTitle')} <span className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>{alerts.data.length}</span>
      </h2>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {alerts.data.map((a) => (
          <Card key={a.id} tight style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ minWidth: 0 }}>
              <Link to={'/shirt/' + a.shirt_id + (a.size ? '?size=' + encodeURIComponent(a.size) : '')} style={{ fontWeight: 600 }}>
                {BY[a.shirt_id]?.name ?? a.shirt_id}
              </Link>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                {t('alert.sizeLabel', { size: a.size ?? t('alert.anySize') })}
                {a.max_price !== null && ' · ' + t('alert.upTo', { price: money(Number(a.max_price)) })}
              </span>
            </span>
            <button type="button" className="link-btn" disabled={remove.isPending} onClick={() => remove.mutate(a.id)}>
              {t('alert.remove')}
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}
