// Feed, like Instagram's home: big photo, double tap (or the heart) to like,
// the latest comment and a way to all of them. Two lists: All — every
// collector's shirts, shuffled so nobody fills it — and Following — the
// stories on top, then what the collectors I follow added, newest first.
import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { timeAgo } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { FollowingPost } from '../../utils/db.ts';
import { Button, ButtonLink, ChatIcon, ErrorState, HeartIcon, Page, Skeleton } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { isCutoutPath } from '../vault/addshirt/studio.ts';
import { WishButton } from '../collectors/WishButton.tsx';
import { FeedTabs } from './FeedTabs.tsx';
import { StoriesRow } from './StoriesRow.tsx';
import { useBlocks } from '../moderation/useBlocks.ts';

const PAGE = 20;
type Pages = InfiniteData<FollowingPost[], string | number | null>;

const postName = (p: FollowingPost, untitled: string) => (p.catalog_id ? BY[p.catalog_id]?.name : undefined) ?? ([p.club, p.season, p.variant].filter(Boolean).join(' ') || untitled);

function Post({ p, src, onLike }: { p: FollowingPost; src: string | undefined; onLike: (on: boolean) => void }) {
  const { t, tp, lang } = usePrefs();
  const [pop, setPop] = useState(0);
  const lastTap = useRef(0);
  const to = '/u/' + p.handle + '/' + encodeURIComponent(p.id);
  const name = postName(p, t('coll.untitled'));
  // Double tap on the photo likes (never unlikes), like Instagram.
  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      if (!p.liked) onLike(true);
      setPop((n) => n + 1);
      lastTap.current = 0;
    } else lastTap.current = now;
  };
  const cutout = isCutoutPath(p.photo_path) || !p.photo_path;
  const player = [p.player_name, p.player_number].filter(Boolean).join(' ');
  return (
    <article className="card" style={{ padding: 0, borderRadius: 22, overflow: 'hidden' }} aria-label={t('following.post', { handle: p.handle, name })}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <Link to={'/u/' + p.handle} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', fontWeight: 650, minWidth: 0 }}>
          <Avatar avatar={p.avatar} name={p.handle} size={34} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{p.handle}</span>
        </Link>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)', flex: 'none' }}>{timeAgo(p.added_at, lang)}</span>
      </header>
      <div data-swipe onClick={tap} onDoubleClick={(e) => e.preventDefault()} style={{ position: 'relative', aspectRatio: '1/1', background: cutout ? 'var(--kit-tile, var(--sunken))' : 'var(--sunken)', display: 'grid', placeItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        {src ? <img src={src} alt={name} draggable={false} className={cutout ? 'shirt-photo' : undefined} style={cutout ? { width: '82%', height: '82%', objectFit: 'contain' } : { width: '100%', height: '100%', objectFit: 'cover' }} /> : <Skeleton height="100%" radius={0} />}
        {pop > 0 && (
          <span key={pop} className="ig-pop" aria-hidden="true">
            <HeartIcon size={96} filled />
          </span>
        )}
      </div>
      <div style={{ padding: '10px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: -6 }}>
          <button type="button" className="icon-btn" aria-pressed={p.liked} aria-label={p.liked ? t('social.liked') : t('social.like')} onClick={() => onLike(!p.liked)} style={{ color: p.liked ? 'var(--neg)' : 'var(--text)' }}>
            <HeartIcon size={22} filled={p.liked} />
          </button>
          <Link to={to + '#comments'} className="icon-btn" aria-label={t('following.comment')} style={{ color: 'var(--text)' }}>
            <ChatIcon size={21} />
          </Link>
          <span style={{ marginLeft: 'auto' }}>
            <WishButton target={{ catalogId: p.catalog_id, kitId: p.kit_id, kitImage: p.kit_image, club: p.club, season: p.season }} name={name} />
          </span>
        </div>
        {p.likes > 0 && <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{tp('social.likes', p.likes)}</div>}
        <Link to={to} style={{ display: 'block', color: 'var(--text)', fontWeight: 650, fontSize: 15, marginTop: 4 }}>
          {name}
        </Link>
        {(p.size || player || p.version) && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{[p.size && t('coll.size', { size: p.size }), player, p.version].filter(Boolean).join(' · ')}</div>}
        {p.last_comment && (
          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            <strong>@{p.last_comment.handle ?? '–'}</strong> {p.last_comment.body}
          </p>
        )}
        <Link to={to + '#comments'} style={{ display: 'inline-block', fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>
          {p.comments > 0 ? t('following.allComments', { n: p.comments }) : t('following.firstComment')}
        </Link>
      </div>
    </article>
  );
}

export default function FollowingPage() {
  return <FeedList mode="following" />;
}

export function AllFeedPage() {
  return <FeedList mode="all" />;
}

function FeedList({ mode }: { mode: 'following' | 'all' }) {
  const { t } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  usePageMeta(mode === 'all' ? t('feedAll.meta') : t('following.meta'));
  // A new shuffle every visit; the same order while paging through it.
  const [seed] = useState(() => Math.random().toString(36).slice(2));
  const key = mode === 'all' ? ['communityFeed', user?.id, seed] : ['followingFeed', user?.id];
  const feed = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => (mode === 'all' ? db.loadCommunityFeed(seed, Number(pageParam ?? 0), PAGE) : db.loadFollowingFeed(pageParam as string | null, PAGE)),
    initialPageParam: (mode === 'all' ? 0 : null) as string | number | null,
    getNextPageParam: (last, all) => (last.length === PAGE ? (mode === 'all' ? all.length * PAGE : last[last.length - 1]!.added_at) : undefined),
    enabled: mode === 'all' || !!user
  });
  const blocks = useBlocks();
  const posts = blocks.visible(feed.data?.pages.flat() ?? [], (p) => p.handle);
  const url = usePhotoUrls(posts.map((p) => (p.photo_path ? { path: p.photo_path, thumbPath: p.thumb_path ?? undefined } : undefined)));
  if (mode === 'following' && !user) return <Navigate to="/signin" replace state={{ from: '/feed/following', notice: 'following.signIn' }} />;

  const like = (p: FollowingPost, on: boolean) => {
    if (!user) {
      navigate('/signin', { state: { from: '/feed/all' } });
      return;
    }
    const flip = (v: boolean) =>
      qc.setQueryData<Pages>(key, (d) => d && { ...d, pages: d.pages.map((pg) => pg.map((x) => (x.id === p.id ? { ...x, liked: v, likes: Math.max(0, x.likes + (v ? 1 : -1)) } : x))) });
    flip(on);
    db.setItemLike(p.id, on)
      .then(() => qc.invalidateQueries({ queryKey: ['publicCollection'] }))
      .catch((e: { code?: string }) => {
        flip(!on);
        toast(e?.code === 'P0429' ? t('social.limited') : t('social.failed'));
      });
  };
  const fallback = (p: FollowingPost) => p.kit_image ?? (p.catalog_id && BY[p.catalog_id]?.photo ? BY[p.catalog_id]!.photo + (BY[p.catalog_id]!.photo!.endsWith('.webp') ? '' : '.webp') : undefined);

  return (
    <>
      <FeedTabs />
      <Page narrow style={{ maxWidth: 560 }}>
        <h1 className="sr-only">{mode === 'all' ? t('feedAll.title') : t('following.title')}</h1>
        {mode === 'following' && <StoriesRow />}
        {feed.isLoading && <Skeleton height={520} radius={22} style={{ marginTop: 16 }} />}
        {feed.isError && <ErrorState what={t('following.title')} onRetry={() => feed.refetch()} />}
        {feed.data && !posts.length && (
          <div className="card" style={{ padding: 24, borderRadius: 22, textAlign: 'center', marginTop: 16 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 6px' }}>{t('following.emptyTitle')}</h2>
            <p style={{ margin: '0 0 14px', color: 'var(--text-2)', lineHeight: 1.5 }}>{mode === 'all' ? t('feedAll.emptyBody') : t('following.emptyBody')}</p>
            <ButtonLink to="/">{t('following.findCollectors')}</ButtonLink>
          </div>
        )}
        <div style={{ display: 'grid', gap: 18, marginTop: 14 }}>
          {posts.map((p) => (
            <Post key={p.id} p={p} src={(p.photo_path ? url({ path: p.photo_path }) : undefined) ?? fallback(p)} onLike={(on) => like(p, on)} />
          ))}
        </div>
        {feed.hasNextPage && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <Button variant="secondary" onClick={() => feed.fetchNextPage()} busy={feed.isFetchingNextPage} disabled={feed.isFetchingNextPage}>
              {t('era.more')}
            </Button>
          </div>
        )}
      </Page>
    </>
  );
}
