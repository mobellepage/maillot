// Collector points in My collection: the total, and how to earn more —
// every shirt bought through Maillot (COLLECTOR_POINTS in config/rules.ts).
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { COLLECTOR_POINTS } from '../../config/rules.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';

export function PointsCard() {
  const { t, tp } = usePrefs();
  const { user } = useSession();
  const points = useQuery({ queryKey: ['myPoints', user?.id], queryFn: db.loadMyPoints, enabled: !!user, staleTime: 60_000 });
  if (!user || !points.data) return null;
  const { total, purchases } = points.data;
  return (
    <section aria-labelledby="points-title" className="card points-card">
      <span className="points-coin" aria-hidden="true">
        ★
      </span>
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('points.eyebrow')}</div>
        <h2 id="points-title" style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800 }}>
          {t('points.total', { n: total.toLocaleString('de-CH') })}
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.45 }}>
          {purchases > 0 ? tp('points.from', purchases) + ' · ' : ''}
          {t('points.how', { shirt: COLLECTOR_POINTS.perShirt, franc: COLLECTOR_POINTS.perFranc })}
        </p>
      </div>
      <Link to="/market" className="btn btn--secondary btn--sm" style={{ color: 'var(--text)' }}>
        {t('points.shop')}
      </Link>
    </section>
  );
}
