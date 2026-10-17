// Under the Discover search: one compact line inviting people to build their
// digital shirt collection — small enough that the leagues stay in view.
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';

export function CollectNudge() {
  const { t } = usePrefs();
  const { user } = useSession();
  const counts = useQuery({ queryKey: ['kitCounts'], queryFn: db.loadKitCounts, staleTime: 5 * 60_000, retry: false });
  const kits = counts.data ? Object.values(counts.data).reduce((a, n) => a + n, 0) : 0;
  return (
    <Link to={user ? '/vault/add/library' : '/signin'} state={user ? undefined : { from: '/vault/add/library' }} className="collect-nudge">
      <span aria-hidden="true" className="collect-nudge-icon">
        ＋
      </span>
      <span>
        <strong>{t('home.nudge.title')}</strong>
        {kits > 0 && <span className="collect-nudge-sub"> · {t('home.nudge.count', { kits: kits.toLocaleString('de-CH') })}</span>}
      </span>
      <span aria-hidden="true">›</span>
    </Link>
  );
}
