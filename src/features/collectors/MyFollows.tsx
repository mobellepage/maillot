// On my own collection: "N followers · following M". A tap opens the list,
// so the collectors I follow (and those who follow me) are one tap away.
import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { Dialog, Segmented } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';

type Tab = 'following' | 'follower';

export function MyFollows() {
  const { t, tp } = usePrefs();
  const { user } = useSession();
  const follows = useQuery({ queryKey: ['myFollows', user?.id], queryFn: db.loadMyFollows, enabled: !!user });
  const [open, setOpen] = useState<Tab | null>(null);
  const [tab, setTab] = useState<Tab>('following');
  const list = follows.data ?? [];
  const following = list.filter((x) => x.direction === 'following');
  const followers = list.filter((x) => x.direction === 'follower');
  const show = (which: Tab) => {
    setTab(which);
    setOpen(which);
  };
  const shown = tab === 'following' ? following : followers;
  if (!user) return null;
  return (
    <>
      <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" className="link-btn" onClick={() => show('follower')} style={{ color: 'inherit' }}>
          {tp('coll.followers', followers.length)}
        </button>
        ·
        <button type="button" className="link-btn" onClick={() => show('following')} style={{ color: 'inherit' }}>
          {t('coll.followingCount', { n: following.length })}
        </button>
      </div>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={t('follows.title')}>
        <Segmented
          label={t('follows.title')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'following', label: t('follows.following', { n: following.length }) },
            { value: 'follower', label: t('follows.followers', { n: followers.length }) }
          ]}
        />
        {!shown.length ? (
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 16 }}>{tab === 'following' ? t('follows.noneFollowing') : t('follows.noneFollowers')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 4 }}>
            {shown.map((x) => (
              <li key={x.direction + x.handle}>
                <Link to={'/u/' + x.handle} className="row-btn" onClick={() => setOpen(null)}>
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
