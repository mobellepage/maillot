// /u/:handle/:itemId — one shirt from a member's collection, as their friends
// see it: the owner's own pictures (main photo and back), name, size, print,
// condition and whether it's open to offers. The catalogue page stays one
// tap away for the market side.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BY } from '../../data.ts';
import { formatDate } from '../../lib/format.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { Badge, Button, ChevronIcon, EmptyState, ErrorState, HEX, Page, ShirtGraphic, Skeleton, alpha } from '../../ui/index.ts';
import { useCatalog } from '../catalog/useCatalog.ts';
import { marketValue } from '../catalog/model.ts';
import { OfferButton } from './OfferButton.tsx';
import { PendingPhotos } from '../vault/PendingPhotos.tsx';
import { InquiryButton } from './InquiryButton.tsx';
import { ShirtSocial } from './ShirtSocial.tsx';
import { WishButton } from './WishButton.tsx';
import { isCutoutPath } from '../vault/addshirt/studio.ts';
import { ModerationMenu } from '../moderation/ModerationMenu.tsx';
import { useBlocks } from '../moderation/useBlocks.ts';

export default function PublicShirtPage() {
  useCatalog();
  const { handle = '', itemId = '' } = useParams();
  const { t, label, lang } = usePrefs();
  const { user } = useSession();
  const collection = useQuery({ queryKey: ['publicCollection', handle, user?.id], queryFn: () => db.loadPublicCollection(handle) });
  const photos = useQuery({ queryKey: ['publicShirtPhotos', handle.toLowerCase(), itemId], queryFn: () => db.loadPublicShirtPhotos(handle, itemId) });
  const stats = useQuery({ queryKey: ['collectorStats', handle.toLowerCase(), user?.id], queryFn: () => db.loadCollectorStats(handle) });
  const pics = (photos.data ?? []).map((p) => ({ kind: p.kind, photo: { path: p.path, thumbPath: p.thumb_path ?? undefined } }));
  const full = usePhotoUrls(pics.map((p) => p.photo));
  const thumb = usePhotoUrls(pics.map((p) => p.photo), true);
  // Which picture is shown — back to the first one on the next shirt.
  const [pick, setPick] = useState({ id: itemId, i: 0 });
  const shown = pick.id === itemId ? pick.i : 0;
  const setShown = (i: number) => setPick({ id: itemId, i });
  const navigate = useNavigate();
  const touch = useRef<number | null>(null);

  const s = collection.data?.find((x) => x.id === itemId);
  // The collection in the profile's order: straight on to the next shirt (arrows, swipe, ← →).
  const list = collection.data ?? [];
  const at = list.findIndex((x) => x.id === itemId);
  const prev = at > 0 ? list[at - 1] : undefined;
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : undefined;
  const linkTo = (x: { id: string }) => '/u/' + handle + '/' + encodeURIComponent(x.id);
  const prevTo = prev ? linkTo(prev) : null;
  const nextTo = next ? linkTo(next) : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.altKey || e.metaKey || e.ctrlKey || (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))) return;
      if (e.key === 'ArrowLeft' && prevTo) navigate(prevTo);
      if (e.key === 'ArrowRight' && nextTo) navigate(nextTo);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevTo, nextTo, navigate]);
  const cat = s?.catalog_id ? BY[s.catalog_id] : undefined;
  const name = s ? (cat?.name ?? ([s.club, s.season, s.variant].filter(Boolean).join(' ') || t('coll.untitled'))) : '';
  usePageMeta(s ? t('pshirt.meta', { name, handle }) : null);
  const blocks = useBlocks();

  if (blocks.isBlocked(handle))
    return (
      <Page narrow>
        <EmptyState
          title={t('mod.blockedProfile', { handle })}
          action={
            <Button variant="secondary" size="sm" onClick={() => blocks.unblock.mutate(handle)} disabled={blocks.unblock.isPending}>
              {t('mod.unblockShort')}
            </Button>
          }
        />
      </Page>
    );

  if (collection.isLoading)
    return (
      <Page>
        <Skeleton height={420} radius={28} />
      </Page>
    );
  if (collection.isError)
    return (
      <Page>
        <ErrorState what={'@' + handle} onRetry={() => collection.refetch()} />
      </Page>
    );
  if (!s)
    return (
      <Page narrow>
        <EmptyState title={t('pshirt.notFound')}>{t('pshirt.notFoundBody', { handle })}</EmptyState>
      </Page>
    );

  // The owner's own photos (the library picture only while they have none).
  const gallery = [
    ...pics.map((p) => ({ key: p.kind, src: full(p.photo), thumb: thumb(p.photo), cutout: isCutoutPath(p.photo.path), alt: p.kind === 'back' ? t('pshirt.backPhoto') : name }))
  ];
  const at0 = Math.max(0, Math.min(shown, gallery.length - 1));
  const current = gallery[at0];
  const src = current?.src;
  const player = [s.player_name, s.player_number].filter(Boolean).join(' ');
  const facts: [string, string][] = [
    s.size ? [t('pshirt.size'), s.size] : null,
    player ? [t('pshirt.print'), player] : null,
    s.version ? [t('pshirt.version'), label('opt', s.version)] : null,
    s.grade !== null ? [t('pshirt.condition'), s.grade + '/10'] : null,
    [t('pshirt.since'), formatDate(s.added_at, lang)]
  ].filter((x): x is [string, string] => !!x);
  const canOffer = !stats.data?.is_me && !!cat && !!s.size && (s.visibility === 'offers' || s.visibility === 'forsale');

  return (
    <Page>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Link to={'/u/' + handle} className="nav-link" style={{ display: 'inline-block', padding: '4px 0', fontSize: 14 }}>
          ← @{handle}
        </Link>
        {list.length > 1 && at >= 0 && (
          <nav aria-label={t('pshirt.browse')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {prevTo ? (
              <Link to={prevTo} className="btn btn--ghost btn--sm" aria-label={t('pshirt.prev')}>
                ‹
              </Link>
            ) : (
              <span className="btn btn--ghost btn--sm" aria-hidden="true" style={{ opacity: 0.35 }}>
                ‹
              </span>
            )}
            <span className="mono" style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 52, textAlign: 'center' }}>
              {at + 1} / {list.length}
            </span>
            {nextTo ? (
              <Link to={nextTo} className="btn btn--ghost btn--sm" aria-label={t('pshirt.next')}>
                ›
              </Link>
            ) : (
              <span className="btn btn--ghost btn--sm" aria-hidden="true" style={{ opacity: 0.35 }}>
                ›
              </span>
            )}
          </nav>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,56px)', marginTop: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div
            data-swipe
            onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              // A clear sideways swipe shows the shirt's next (or previous) photo.
              const from = touch.current;
              const x = e.changedTouches[0]?.clientX;
              touch.current = null;
              if (from === null || x === undefined || Math.abs(x - from) < 60) return;
              if (x < from && at0 < gallery.length - 1) setShown(at0 + 1);
              if (x > from && at0 > 0) setShown(at0 - 1);
            }}
            style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 28, overflow: 'hidden', display: 'grid', placeItems: 'center', border: '1px solid var(--line)', background: src && !current?.cutout ? 'var(--sunken)' : `radial-gradient(circle at 50% 44%,${alpha(cat ? cat.glow : HEX.muted, 0.3)},rgba(0,0,0,0) 60%),var(--sunken)` }}
          >
            {src ? (
              <img src={src} alt={current?.alt} className={current?.cutout ? 'shirt-photo' : undefined} style={current?.cutout ? { width: '86%', height: '86%', objectFit: 'contain' } : { width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : photos.isLoading ? (
              <Skeleton height="100%" radius={0} />
            ) : s.kit_image ? (
              <PendingPhotos src={s.kit_image} />
            ) : (
              <ShirtGraphic hero pat={cat?.pat ?? HEX.placeholderPat} trim={cat?.trim ?? HEX.muted} crest={cat?.crest ?? HEX.muted} photo={cat?.photo} title={name} style={{ width: '66%' }} />
            )}
            {/* The arrows on the photo go through this shirt's photos; the next shirt is at the top. */}
            {at0 > 0 && (
              <button type="button" className="photo-strip__arrow photo-strip__arrow--prev" aria-label={t('pshirt.prevPhoto')} onClick={() => setShown(at0 - 1)} style={{ zIndex: 3 }}>
                <ChevronIcon size={14} style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
            {at0 < gallery.length - 1 && (
              <button type="button" className="photo-strip__arrow photo-strip__arrow--next" aria-label={t('pshirt.nextPhoto')} onClick={() => setShown(at0 + 1)} style={{ zIndex: 3 }}>
                <ChevronIcon size={14} />
              </button>
            )}
          </div>
          {gallery.length > 1 && (
            <div role="group" aria-label={t('pshirt.photos')} style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {gallery.map((p, i) => (
                <button key={p.key} type="button" aria-pressed={i === shown} aria-label={p.alt} onClick={() => setShown(i)} style={{ width: 72, height: 72, padding: 0, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${i === shown ? 'var(--text)' : 'var(--line)'}`, background: 'var(--sunken)' }}>
                  {p.thumb && <img src={p.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: p.cutout ? 'contain' : 'cover' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{t('pshirt.from', { handle })}</div>
            <ModerationMenu handle={handle} report={{ kind: 'shirt', target: s.id }} />
          </div>
          <h1 className="display display--lg" style={{ margin: '8px 0 0', fontSize: 'clamp(30px,4vw,46px)' }}>
            {name}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {s.verified && <Badge tone="accent">{t('coll.verified')}</Badge>}
            <Badge tone={s.visibility === 'public' ? 'neutral' : 'info'}>{s.visibility === 'public' ? t('inq.piece') : t('vault.vis.' + s.visibility)}</Badge>
          </div>
          <dl style={{ margin: '22px 0 0', display: 'grid', gap: 0 }}>
            {facts.map(([k, v]) => (
              <div key={k} className="kv">
                <dt style={{ color: 'var(--muted)' }}>{k}</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd>
              </div>
            ))}
          </dl>
          {!stats.data?.is_me && (
            <div style={{ marginTop: 16 }}>
              <WishButton target={{ catalogId: s.catalog_id, kitId: s.kit_id, kitImage: s.kit_image, club: s.club, season: s.season }} name={name} labelled />
            </div>
          )}
          {canOffer && cat && s.size && <OfferButton itemId={s.id} name={name} owner={handle} suggested={marketValue(cat, s.size)} />}
          {!stats.data?.is_me && s.visibility === 'public' && (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>{s.inquiries_enabled ? t('inq.notForSale') : t('inq.notForSaleNoAsk')}</p>
              {s.inquiries_enabled && <InquiryButton itemId={s.id} name={name} owner={handle} />}
            </div>
          )}
          {cat && (
            <Link to={'/shirt/' + cat.id} style={{ display: 'inline-block', marginTop: 20, fontWeight: 600 }}>
              {t('pshirt.catalog')} ›
            </Link>
          )}
          <ShirtSocial itemId={s.id} />
        </div>
      </div>
    </Page>
  );
}
