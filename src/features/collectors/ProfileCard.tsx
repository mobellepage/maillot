// On /account: what the public profile shows (the collection value is
// opt-in) and the collectors the member follows.
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Card } from '../../ui/index.ts';

export function ProfileCard() {
  const { t, tp } = usePrefs();
  const { user, profile } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const following = useQuery({ queryKey: ['myFollowing', user?.id], queryFn: db.loadMyFollowing, enabled: !!user });
  const showValue = useMutation({
    mutationFn: (show: boolean) => db.setShowCollectionValue(user!.id, show),
    onSuccess: (_r, show) => {
      toast(show ? t('coll.valueShown') : t('coll.valueHidden'));
      qc.invalidateQueries({ queryKey: ['profile', user?.id] });
      qc.invalidateQueries({ queryKey: ['collectorStats'] });
      qc.invalidateQueries({ queryKey: ['publicCollection'] });
    },
    onError: () => toast(t('coll.saveFailed'))
  });
  if (!user || !profile) return null;
  const checked = showValue.isPending ? !!showValue.variables : profile.showCollectionValue;

  return (
    <Card>
      <h2 style={{ fontSize: 17, marginBottom: 6 }}>{t('coll.profileCard')}</h2>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} disabled={showValue.isPending || !profile.handle} onChange={(e) => showValue.mutate(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--accent)', flex: 'none' }} />
        <span>
          <span style={{ display: 'block', fontSize: 14.5 }}>{t('coll.showValue')}</span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.45 }}>{t('coll.showValueHint')}</span>
        </span>
      </label>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <div style={{ fontSize: 14.5, marginBottom: 8 }}>
          {t('coll.youFollow')} {following.data && <span className="mono" style={{ color: 'var(--muted)', fontSize: 12.5 }}>{following.data.length}</span>}
        </div>
        {following.data?.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            {t('coll.followNobody')}{' '}
            <Link to="/market" style={{ color: 'var(--accent)' }}>
              {t('coll.findCollectors')}
            </Link>
          </p>
        )}
        {!!following.data?.length && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {following.data.map((f) => (
              <li key={f.handle}>
                <Link to={'/u/' + f.handle} className="row-btn" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 4px', color: 'var(--text)' }}>
                  <span style={{ fontWeight: 600 }}>@{f.handle}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{tp('coll.shirts', f.shirts)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
