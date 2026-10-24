// Stories, like Instagram: the collectors I follow who added shirts in the
// last 24 hours, as rings above the "Following" feed. A tap shows their new
// shirts full screen, one after another (tap right = next, left = back);
// rings already watched turn grey (remembered on this device).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { timeAgo } from '../../lib/format.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import * as db from '../../utils/db.ts';
import type { FollowingStory } from '../../utils/db.ts';
import { CloseIcon } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { useBlocks } from '../moderation/useBlocks.ts';

const SEEN_KEY = 'kv_stories_seen';
const SLIDE_MS = 5000;
type Item = FollowingStory['items'][number];

const itemName = (x: Item, untitled: string) => (x.catalog_id ? BY[x.catalog_id]?.name : undefined) ?? ([x.club, x.season, x.variant].filter(Boolean).join(' ') || untitled);

function Viewer({ stories, start, onClose, onSeen }: { stories: FollowingStory[]; start: number; onClose: () => void; onSeen: (s: FollowingStory) => void }) {
  const { t, lang } = usePrefs();
  const [pos, setPos] = useState({ story: start, item: 0 });
  const story = stories[pos.story];
  const item = story?.items[pos.item];
  const url = usePhotoUrls(stories.flatMap((s) => s.items.map((i) => (i.photo_path ? { path: i.photo_path } : undefined))));
  const timer = useRef(0);

  const next = () =>
    setPos((p) => {
      const s = stories[p.story];
      if (s && p.item < s.items.length - 1) return { story: p.story, item: p.item + 1 };
      if (p.story < stories.length - 1) return { story: p.story + 1, item: 0 };
      onClose();
      return p;
    });
  const prev = () => setPos((p) => (p.item > 0 ? { story: p.story, item: p.item - 1 } : p.story > 0 ? { story: p.story - 1, item: 0 } : p));

  useEffect(() => {
    if (story) onSeen(story);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(next, SLIDE_MS);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.story, pos.item]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    // The page behind doesn't scroll while a story is open.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!story || !item) return null;
  const src = (item.photo_path ? url({ path: item.photo_path }) : undefined) ?? item.kit_image ?? undefined;
  const name = itemName(item, t('coll.untitled'));

  // Into <body>: a page's entrance animation would otherwise trap the full screen inside it.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('stories.of', { handle: story.handle })} className="story-viewer">
      <div className="story-viewer__bars" aria-hidden="true">
        {story.items.map((x, i) => (
          <span key={x.id}>
            <span className={i === pos.item ? 'story-viewer__fill story-viewer__fill--run' : 'story-viewer__fill'} style={{ width: i < pos.item ? '100%' : i === pos.item ? undefined : '0%', animationDuration: SLIDE_MS + 'ms' }} key={pos.story + ':' + pos.item} />
          </span>
        ))}
      </div>
      <div className="story-viewer__head">
        <Link to={'/u/' + story.handle} onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 650 }}>
          <Avatar avatar={story.avatar} name={story.handle} size={32} />@{story.handle}
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{timeAgo(item.added_at, lang)}</span>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="story-viewer__close">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="story-viewer__stage">
        {src && <img src={src} alt={name} />}
        <button type="button" className="story-viewer__tap story-viewer__tap--prev" aria-label={t('stories.prev')} onClick={prev} />
        <button type="button" className="story-viewer__tap story-viewer__tap--next" aria-label={t('stories.next')} onClick={next} />
      </div>
      <div className="story-viewer__foot">
        <div style={{ fontWeight: 700, fontSize: 17 }}>{name}</div>
        <Link to={'/u/' + story.handle + '/' + encodeURIComponent(item.id)} onClick={onClose} className="btn btn--sm" style={{ marginTop: 10 }}>
          {t('stories.open')} ›
        </Link>
      </div>
    </div>,
    document.body
  );
}

export function StoriesRow() {
  const { t } = usePrefs();
  const { user } = useSession();
  const stories = useQuery({ queryKey: ['followingStories', user?.id], queryFn: db.loadFollowingStories, enabled: !!user, staleTime: 60_000 });
  const [seen, setSeen] = useState<Record<string, string>>(() => loadJSON(SEEN_KEY, {}));
  const [open, setOpen] = useState<number | null>(null);
  const blocks = useBlocks();
  const list = blocks.visible(stories.data ?? [], (s) => s.handle);
  // Unwatched first, like Instagram.
  const sorted = [...list].sort((a, b) => Number(!!seen[a.handle] && seen[a.handle]! >= a.latest) - Number(!!seen[b.handle] && seen[b.handle]! >= b.latest));
  const firstPic = usePhotoUrls(sorted.map((s) => (s.items.at(-1)?.photo_path ? { path: s.items.at(-1)!.photo_path! } : undefined)), true);
  if (!list.length) return null;
  const markSeen = (s: FollowingStory) =>
    setSeen((prev) => {
      if (prev[s.handle] && prev[s.handle]! >= s.latest) return prev;
      const next = { ...prev, [s.handle]: s.latest };
      saveJSON(SEEN_KEY, next);
      return next;
    });
  return (
    <>
      <ul className="ig-stories" aria-label={t('stories.title')}>
        {sorted.map((s, i) => {
          const watched = !!seen[s.handle] && seen[s.handle]! >= s.latest;
          const last = s.items.at(-1);
          const pic = (last?.photo_path ? firstPic({ path: last.photo_path }) : undefined) ?? last?.kit_image ?? undefined;
          return (
            <li key={s.handle}>
              <button type="button" className="ig-highlight" onClick={() => setOpen(i)} aria-label={t('stories.of', { handle: s.handle }) + (watched ? '' : ' · ' + t('stories.new'))}>
                <span className={'ig-highlight__ring ' + (watched ? 'ig-highlight__ring--seen' : 'ig-highlight__ring--story')}>
                  <span className="ig-highlight__img">{pic ? <img src={pic} alt="" /> : <Avatar avatar={s.avatar} name={s.handle} size={56} />}</span>
                </span>
                <span className="ig-highlight__name">@{s.handle}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {open !== null && <Viewer stories={sorted} start={open} onClose={() => setOpen(null)} onSeen={markSeen} />}
    </>
  );
}
