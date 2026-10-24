// Discover: other collectors' collections, a random handful each visit, with
// a peek at their latest shirts and a Follow button — following tells you
// when they add a shirt (notifications 'followed_shirt').
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import * as db from '../../utils/db.ts';
import type { DiscoverCollector } from '../../utils/db.ts';
import { Button, ButtonLink, ScrollRow, SectionHeader } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { DealerBadge } from '../collectors/DealerBadge.tsx';
import { useBlocks } from '../moderation/useBlocks.ts';

export function DiscoverCollectors() {
  const { t } = usePrefs();
  const { user } = useSession();
  const list = useQuery({ queryKey: ['discoverCollectors', user?.id], queryFn: () => db.loadDiscoverCollectors(8), staleTime: 5 * 60_000, retry: false });
  const blocks = useBlocks();
  const all = blocks.visible(list.data ?? [], (c) => c.handle);
  const url = usePhotoUrls(all.flatMap((c) => c.preview.map((p) => (p.thumb_path ? { path: p.thumb_path } : undefined))), true);
  if (!all.length) return null;
  return (
    <section aria-labelledby="discover-coll-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(40px,5vw,72px) var(--gutter) 0' }}>
      <SectionHeader id="discover-coll-title" eyebrow={t('home.dc.eyebrow')} title={t('home.dc.title')} />
      <p style={{ margin: '-6px 0 14px', color: 'var(--text-2)', fontSize: 14.5 }}>{t('home.dc.body')}</p>
      <ScrollRow centered prevLabel={t('common.scrollPrev')} nextLabel={t('common.scrollNext')}>
        {all.map((c) => (
          <li key={c.handle} style={{ flexBasis: 'clamp(240px,24vw,290px)' }}>
            <CollectorCard c={c} url={url} />
          </li>
        ))}
      </ScrollRow>
    </section>
  );
}

function CollectorCard({ c, url }: { c: DiscoverCollector; url: (p: { path: string } | undefined) => string | undefined }) {
  const { t, tp } = usePrefs();
  return (
    <div className="card" style={{ padding: 16, borderRadius: 22, display: 'grid', gap: 12 }}>
      <Link to={'/u/' + c.handle} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', textDecoration: 'none', minWidth: 0 }}>
        <Avatar avatar={c.avatar} name={c.handle} size={44} ring={false} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 750, fontSize: 15 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{c.handle}</span>
            {c.dealer && <DealerBadge compact />}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)' }}>
            {tp('coll.shirts', c.shirts)} · {tp('coll.followers', c.followers)}
          </span>
        </span>
      </Link>
      <Link to={'/u/' + c.handle} aria-label={t('home.dc.open', { handle: c.handle })} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
        {Array.from({ length: 4 }, (_, i) => {
          const p = c.preview[i];
          const cat = p?.catalog_id ? BY[p.catalog_id] : undefined;
          const src = p ? (p.thumb_path ? url({ path: p.thumb_path }) : p.kit_image ?? (cat?.photo ? (cat.photo.endsWith('.webp') ? cat.photo : cat.photo + '-400.webp') : undefined)) : undefined;
          return (
            <span key={i} style={{ aspectRatio: '1/1', borderRadius: 10, background: 'var(--sunken)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
              {src && <img src={src} alt="" loading="lazy" decoding="async" style={p?.thumb_path ? { width: '100%', height: '100%', objectFit: 'cover' } : { width: '86%', height: '86%', objectFit: 'contain' }} />}
            </span>
          );
        })}
      </Link>
      <FollowToggle handle={c.handle} following={c.is_following} />
    </div>
  );
}

function FollowToggle({ handle, following }: { handle: string; following: boolean }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const { pathname } = useLocation();
  const toast = useToast();
  const qc = useQueryClient();
  const [on, setOn] = useState(following);
  const toggle = useMutation({
    mutationFn: (follow: boolean) => db.setFollowing(handle, follow),
    onMutate: (follow) => setOn(follow),
    onError: (e, follow) => {
      setOn(!follow);
      toast((e as { code?: string }).code === 'P0429' ? t('coll.followLimited') : t('coll.followFailed'));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['myFollowing'] })
  });
  if (!user)
    return (
      <ButtonLink to="/signin" state={{ from: pathname, notice: 'coll.signInToFollow' }} size="sm" variant="secondary">
        {t('coll.follow')}
      </ButtonLink>
    );
  return (
    <Button size="sm" variant={on ? 'secondary' : 'primary'} aria-pressed={on} disabled={toggle.isPending} onClick={() => toggle.mutate(!on)} aria-label={(on ? t('coll.following') : t('coll.follow')) + ': @' + handle}>
      {on ? t('coll.following') : t('coll.follow')}
    </Button>
  );
}
