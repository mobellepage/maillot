// A collector's visible shirts on their profile (/u/:handle), laid out like
// the member's own collection: a row to swipe through (the owner's own
// photos), a heart on every card and the leagues
// below to look for shirts of one league. No values and no offer buttons
// here — what a collection is worth stays with its owner, and offers start
// on the shirt's own page.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { PublicShirt } from '../../utils/db.ts';
import type { Photo } from '../../types/domain.ts';
import { Badge, GridIcon, HEX, HeartIcon, ListIcon, ScrollRow, ShirtGraphic, StarIcon, alpha } from '../../ui/index.ts';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import { isCutoutPath } from '../vault/addshirt/studio.ts';
import { PendingPhotos } from '../vault/PendingPhotos.tsx';
import { PhotoStrip } from '../vault/PhotoStrip.tsx';
import { WishButton } from './WishButton.tsx';
import { leagueOf } from '../vault/model.ts';
import { Link } from 'react-router';

const photoOf = (s: PublicShirt): Photo | undefined => (s.photo_path ? { path: s.photo_path, thumbPath: s.thumb_path ?? undefined } : undefined);
const publicShirtName = (s: PublicShirt, untitled: string) => (s.catalog_id ? BY[s.catalog_id]?.name : undefined) ?? ([s.club, s.season, s.variant].filter(Boolean).join(' ') || untitled);
const libraryOf = (s: PublicShirt): string | undefined => {
  if (s.kit_image) return s.kit_image;
  const photo = s.catalog_id ? BY[s.catalog_id]?.photo : undefined;
  return photo ? (photo.endsWith('.webp') ? photo : photo + '-400.webp') : undefined;
};

/** The heart on a card: likes the owner's shirt (signed in), visitors are sent to sign in. */
function LikeButton({ s, handle, name }: { s: PublicShirt; handle: string; name: string }) {
  const { t, tp } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Every cached copy of this collection (the profile, the shirt page) moves at once.
  const flip = (on: boolean) => qc.setQueriesData<PublicShirt[]>({ queryKey: ['publicCollection'] }, (xs) => xs?.map((x) => (x.id === s.id ? { ...x, liked: on, likes: Math.max(0, x.likes + (on ? 1 : -1)) } : x)));
  const like = useMutation({
    mutationFn: (on: boolean) => db.setItemLike(s.id, on),
    onMutate: (on) => flip(on),
    onError: (e, on) => {
      flip(!on);
      toast((e as { code?: string }).code === 'P0429' ? t('social.limited') : t('social.failed'));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['itemSocial', s.id] })
  });
  const click = () => (user ? like.mutate(!s.liked) : navigate('/signin', { state: { from: '/u/' + handle, notice: 'social.signInToLike' } }));
  return (
    <button type="button" className="icon-btn" aria-pressed={s.liked} aria-label={(s.liked ? t('social.liked') : t('social.like')) + ' · ' + name} onClick={click} style={{ position: 'relative', zIndex: 2, height: 32, minWidth: 32, padding: '0 8px', borderRadius: 999, gap: 5, display: 'inline-flex', alignItems: 'center', color: s.liked ? 'var(--neg)' : undefined }}>
      <HeartIcon size={16} filled={s.liked} />
      {s.likes > 0 && (
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }} aria-label={tp('social.likes', s.likes)}>
          {s.likes}
        </span>
      )}
    </button>
  );
}

export function PublicCollection({ shirts, owner }: { shirts: PublicShirt[]; owner: string }) {
  const { t, label } = usePrefs();
  const url = usePhotoUrls(shirts.map(photoOf), true);
  const clubs = useQuery({ queryKey: ['kitClubs'], queryFn: db.loadKitClubs, staleTime: 10 * 60_000 });
  const [league, setLeague] = useState('all');
  // A grid like Instagram, or the row to swipe through; remembered on this device.
  const [view, setViewState] = useState<'grid' | 'row'>(() => (loadJSON<string>('kv_coll_view', 'grid') === 'row' ? 'row' : 'grid'));
  const setView = (v: 'grid' | 'row') => {
    setViewState(v);
    saveJSON('kv_coll_view', v);
  };
  // Each shirt's league, and the leagues as round buttons (with a picture of one of its shirts).
  const leagueKeys = shirts.map((s) => leagueOf({ catalogId: s.catalog_id, proposedClub: s.club ?? '' }, clubs.data ?? []) ?? '?');
  const leagues = [...new Set(leagueKeys)]
    .map((key) => {
      const s = shirts[leagueKeys.indexOf(key)]!;
      return { key, count: leagueKeys.filter((k) => k === key).length, pic: libraryOf(s) ?? url(photoOf(s)) };
    })
    .sort((a, b) => (a.key === '?' ? 1 : b.key === '?' ? -1 : b.count - a.count));
  const active = league !== 'all' && leagues.some((l) => l.key === league) ? league : 'all';
  const shown = shirts.filter((_, i) => active === 'all' || leagueKeys[i] === active);

  const leagueButtons = leagues.length > 1 && (
    <div role="group" aria-label={t('vault.byLeague')} className="coll-leagues">
      {[{ key: 'all', count: shirts.length, pic: undefined as string | undefined }, ...leagues].map((l) => (
        <button key={l.key} type="button" aria-pressed={active === l.key} onClick={() => setLeague(l.key)} className="coll-league">
          <span className="coll-league-disc">{l.pic ? <img src={l.pic} alt="" loading="lazy" /> : <span aria-hidden="true">👕</span>}</span>
          <span className="coll-league-name">{l.key === 'all' ? t('vault.allLeagues') : l.key === 'National Teams' ? t('lib.nations') : l.key === '?' ? t('vault.otherLeague') : l.key}</span>
          <span className="coll-league-count">{l.count}</span>
        </button>
      ))}
    </div>
  );
  const toolbar = (
    <div role="group" aria-label={t('coll.view')} style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
      <button type="button" className="icon-btn" aria-pressed={view === 'grid'} aria-label={t('coll.viewGrid')} onClick={() => setView('grid')} style={{ color: view === 'grid' ? 'var(--text)' : 'var(--muted)' }}>
        <GridIcon size={17} />
      </button>
      <button type="button" className="icon-btn" aria-pressed={view === 'row'} aria-label={t('coll.viewRow')} onClick={() => setView('row')} style={{ color: view === 'row' ? 'var(--text)' : 'var(--muted)' }}>
        <ListIcon size={17} />
      </button>
    </div>
  );

  if (view === 'grid')
    return (
      <>
        {toolbar}
        {leagueButtons}
        <ul aria-label={t('coll.row', { handle: owner })} className="ig-grid">
          {shown.map((s) => {
            const name = publicShirtName(s, t('coll.untitled'));
            const own = url(photoOf(s));
            const src = own ?? libraryOf(s);
            return (
              <li key={s.id}>
                <Link to={'/u/' + owner + '/' + encodeURIComponent(s.id)} aria-label={name}>
                  {src && <img src={src} alt="" loading="lazy" decoding="async" className={own && !isCutoutPath(s.photo_path) ? undefined : 'ig-grid__cutout'} />}
                  {s.highlighted && (
                    <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 6, color: 'var(--warn)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.4))' }}>
                      <StarIcon size={15} filled />
                    </span>
                  )}
                  {s.visibility !== 'public' && (
                    <span className="badge badge--info" style={{ position: 'absolute', left: 6, bottom: 6, fontSize: 9 }}>
                      {t('vault.vis.' + s.visibility)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </>
    );

  return (
    <>
      {toolbar}
      <ScrollRow label={t('coll.row', { handle: owner })} prevLabel={t('common.scrollPrev')} nextLabel={t('common.scrollNext')}>
        {shown.map((s) => {
          const cat = s.catalog_id ? BY[s.catalog_id] : undefined;
          const name = publicShirtName(s, t('coll.untitled'));
          const to = '/u/' + owner + '/' + encodeURIComponent(s.id);
          // Other collectors' shirts show their own photo (the library picture only while they have none).
          const own = url(photoOf(s));
          const slides = own ? [{ src: own, cutout: isCutoutPath(s.photo_path) }] : [];
          const player = [s.player_name, s.player_number].filter(Boolean).join(' ');
          return (
            <li key={s.id} className="coll-slide">
              <article className="card card--interactive" style={{ position: 'relative', padding: 0, borderRadius: 22, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1/1.08', display: 'grid', placeItems: 'center', position: 'relative', background: `radial-gradient(circle at 50% 46%,${alpha(cat ? cat.glow : HEX.muted, 0.3)},rgba(0,0,0,0) 62%),var(--sunken)` }}>
                  {slides.length ? (
                    <PhotoStrip slides={slides} to={to} label={name} prevLabel={t('common.scrollPrev')} nextLabel={t('common.scrollNext')} />
                  ) : s.kit_image ? (
                    <PendingPhotos src={s.kit_image} />
                  ) : (
                    <ShirtGraphic pat={cat?.pat ?? HEX.placeholderPat} trim={cat?.trim ?? HEX.muted} crest={cat?.crest ?? HEX.muted} photo={cat?.photo} style={{ width: '66%' }} />
                  )}
                  {s.size && (
                    <span className="badge badge--neutral" style={{ position: 'absolute', top: 12, left: 12, zIndex: 3, fontSize: 9.5, pointerEvents: 'none' }}>
                      {t('coll.size', { size: s.size })}
                    </span>
                  )}
                  {/* Only what differs from a collector's piece: for sale, open to offers, verified. */}
                  {(s.visibility === 'offers' || s.visibility === 'forsale' || s.verified) && (
                    <span style={{ position: 'absolute', top: 12, right: 12, zIndex: 3, display: 'flex', gap: 4, pointerEvents: 'none' }}>
                      {s.verified && (
                        <Badge tone="accent" style={{ fontSize: 9.5 }}>
                          {t('coll.verified')}
                        </Badge>
                      )}
                      {s.visibility !== 'public' && (
                        <Badge tone="info" style={{ fontSize: 9.5 }}>
                          {t('vault.vis.' + s.visibility)}
                        </Badge>
                      )}
                    </span>
                  )}
                  {s.highlighted && (
                    <span className="badge badge--warn" style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 3, fontSize: 9.5, pointerEvents: 'none', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      <StarIcon size={11} filled /> {t('hl.badge')}
                    </span>
                  )}
                </div>
                <div style={{ padding: '14px 16px 16px' }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, height: '2.5em', overflow: 'hidden' }}>
                    {/* The owner's own shirt (their photos), not the catalogue entry. */}
                    <Link to={to} className="stretched-link" style={{ color: 'inherit' }}>
                      {name}
                    </Link>
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[player, s.version && label('opt', s.version), s.grade !== null && s.grade + '/10'].filter(Boolean).join(' · ')}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 'none' }}>
                      <WishButton target={{ catalogId: s.catalog_id, kitId: s.kit_id, kitImage: s.kit_image, club: s.club, season: s.season }} name={name} />
                      <LikeButton s={s} handle={owner} name={name} />
                    </span>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ScrollRow>
      {leagueButtons}
    </>
  );
}
