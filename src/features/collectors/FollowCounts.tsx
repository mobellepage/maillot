// Instagram's profile numbers: shirts · followers · following. The two
// follow counts open the lists (collector_follows), one tap from each
// collector's profile.
import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { Dialog, Segmented } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';

type Tab = 'following' | 'follower';

function Count({ n, label, onClick }: { n: number | string; label: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="mono" style={{ display: 'block', fontSize: 19, fontWeight: 750, color: 'var(--text)', lineHeight: 1.1 }}>
        {n}
      </span>
      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>{label}</span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'center', minWidth: 64 }}>
      {body}
    </button>
  ) : (
    <span style={{ textAlign: 'center', minWidth: 64 }}>{body}</span>
  );
}

export function FollowCounts({ handle, shirts, followers, following }: { handle: string; shirts: number; followers: number; following: number }) {
  const { t, tp } = usePrefs();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('follower');
  const list = useQuery({ queryKey: ['collectorFollows', handle.toLowerCase()], queryFn: () => db.loadCollectorFollows(handle), enabled: open });
  const shown = (list.data ?? []).filter((x) => x.direction === tab);
  const show = (which: Tab) => {
    setTab(which);
    setOpen(true);
  };
  return (
    <>
      <div style={{ display: 'flex', gap: 'clamp(14px,4vw,32px)', alignItems: 'flex-start' }}>
        <Count n={shirts} label={t('ig.shirts')} />
        <Count n={followers} label={t('ig.followers')} onClick={() => show('follower')} />
        <Count n={following} label={t('ig.following')} onClick={() => show('following')} />
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title={'@' + handle}>
        <Segmented
          label={t('follows.title')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'follower', label: t('follows.followers', { n: followers }) },
            { value: 'following', label: t('follows.following', { n: following }) }
          ]}
        />
        {list.isLoading ? (
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 16 }}>{t('common.loading')}</p>
        ) : !shown.length ? (
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 16 }}>{tab === 'following' ? t('ig.noneFollowing') : t('ig.noneFollowers')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 4 }}>
            {shown.map((x) => (
              <li key={x.direction + x.handle}>
                <Link to={'/u/' + x.handle} className="row-btn" onClick={() => setOpen(false)}>
                  <Avatar avatar={x.avatar} name={x.handle} size={40} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{x.handle}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)' }}>{tp('follows.shirts', x.shirts)}</span>
                  </span>
                  <span aria-hidden="true" style={{ color: 'var(--muted)' }}>
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}
