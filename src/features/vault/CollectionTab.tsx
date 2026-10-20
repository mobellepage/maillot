import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { CustomItem } from '../../types/domain.ts';
import { downloadVaultCard } from '../../utils/cardExport.js';
import { ButtonLink, DownloadIcon, EmptyState, ErrorState, Notice, ScrollRow, ShirtGraphic, Skeleton, StarIcon, HEX } from '../../ui/index.ts';
import { badgeFor, highlightsFirst, itemLook, itemName, leagueOf, libraryPicture, valueOf } from './model.ts';
import { HighlightButton } from './HighlightButton.tsx';
import type { Photo } from '../../types/domain.ts';
import { isCutout } from './addshirt/studio.ts';
import { PhotoStrip } from './PhotoStrip.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { PendingPhotos } from './PendingPhotos.tsx';

// The studio cut-out first, then the camera photos (front, back, details).
const ORDER = ['front_studio', 'front', 'back'];
const photosOf = (c: CustomItem): { key: string; photo: Photo }[] =>
  Object.entries(c.photos || {})
    .filter((e): e is [string, Photo] => !!e[1])
    .sort(([a], [b]) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
    .map(([key, photo]) => ({ key, photo }));

export function CollectionTab({ items: all, loading, error, onRetry }: { items: CustomItem[]; loading?: boolean; error?: boolean; onRetry?: () => void }) {
  const { money, t, tp } = usePrefs();
  // The member's highlights (top five) come first.
  const items = highlightsFirst(all);
  const rejected = items.filter((c) => c.verification.status === 'abgelehnt');
  const shots = items.map(photosOf);
  const url = usePhotoUrls(shots.flat().map((x) => x.photo), true);
  const clubs = useQuery({ queryKey: ['kitClubs'], queryFn: db.loadKitClubs, staleTime: 10 * 60_000 });
  const [league, setLeague] = useState('all');
  // Each shirt's league, and the leagues as round buttons (with a picture of one of its shirts).
  const leagueKeys = items.map((c) => leagueOf(c, clubs.data ?? []) ?? '?');
  const leagues = [...new Set(leagueKeys)]
    .map((key) => {
      const idx = leagueKeys.indexOf(key);
      const c = items[idx]!;
      const own = shots[idx]![0];
      const pic = libraryPicture(c, true) || (own && url(own.photo)) || undefined;
      return { key, count: leagueKeys.filter((k) => k === key).length, pic };
    })
    .sort((a, b) => (a.key === '?' ? 1 : b.key === '?' ? -1 : b.count - a.count));
  const active = league !== 'all' && leagues.some((l) => l.key === league) ? league : 'all';
  const shown = items.map((c, i) => ({ c, i })).filter(({ i }) => active === 'all' || leagueKeys[i] === active);
  if (loading)
    return (
      <div className="grid-cards" style={{ marginTop: 24 }} role="status" aria-busy="true" aria-label={t('vault.loading')}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={280} radius={20} />
        ))}
      </div>
    );
  if (error)
    return (
      <div style={{ marginTop: 24 }}>
        <ErrorState what={t('what.collection')} onRetry={onRetry} />
      </div>
    );
  if (!items.length) {
    return (
      <div style={{ marginTop: 24 }}>
        <EmptyState accent title={t('vault.start')} action={<ButtonLink to="/vault/add">{t('vault.addFirst')}</ButtonLink>}>
          {t('vault.startBody')}
        </EmptyState>
      </div>
    );
  }
  return (
    <>
      {rejected.length > 0 && (
        <Notice tone="neg" style={{ marginTop: 24 }}>
          <strong>{tp('vault.rejected', rejected.length)}</strong>
          {rejected.map((c) => (
            <div key={c.id} style={{ marginTop: 6, color: 'var(--text-2)' }}>
              <Link to={'/vault/item/' + c.id} style={{ color: 'inherit', fontWeight: 600 }}>
                {itemName(c)}
              </Link>{' '}
              — {t(c.verification.reason)}
            </div>
          ))}
        </Notice>
      )}
      <ScrollRow label={t('vault.collectionRow')} prevLabel={t('common.scrollPrev')} nextLabel={t('common.scrollNext')}>
        {shown.map(({ c, i }) => {
          const badge = badgeFor(c);
          const { look, glow } = itemLook(c);
          const value = valueOf(c);
          const name = itemName(c);
          // Greyed out only while the member has no photos of their own (not while theirs load).
          const hasOwn = shots[i]!.length > 0;
          // The library picture leads (the collection looks like a catalogue); swiping shows the member's own photos.
          const lib = hasOwn ? libraryPicture(c, true) : undefined;
          const slides = [...(lib ? [{ src: lib, cutout: true }] : []), ...shots[i]!.map((x) => ({ src: url(x.photo), cutout: isCutout(x.key) }))].filter((x): x is { src: string; cutout: boolean } => !!x.src);
          return (
            <li key={c.id} className="coll-slide">
              <article className="card card--interactive" style={{ position: 'relative', padding: 0, borderRadius: 22, overflow: 'hidden' }}>
                <div className={hasOwn ? undefined : 'shirt-pending'} style={{ aspectRatio: '1/1.08', display: 'grid', placeItems: 'center', position: 'relative', background: hasOwn ? `radial-gradient(circle at 50% 46%,${glow},rgba(0,0,0,0) 62%),var(--sunken)` : 'var(--kit-tile)' }}>
                  {slides.length ? (
                    <PhotoStrip slides={slides} to={'/vault/item/' + c.id} label={name} prevLabel={t('common.scrollPrev')} nextLabel={t('common.scrollNext')} />
                  ) : hasOwn ? (
                    <Skeleton height="100%" radius={0} />
                  ) : c.kitImage ? (
                    <PendingPhotos src={c.kitImage} nudge />
                  ) : (
                    <>
                      <ShirtGraphic {...look} style={{ width: '66%' }} />
                      <span className="badge badge--neutral pending-nudge">📷 {t('ownphotos.title')}</span>
                    </>
                  )}
                  {c.size && (
                    <span className="badge badge--neutral" style={{ position: 'absolute', top: 12, left: 12, zIndex: 3, fontSize: 9.5, pointerEvents: 'none' }}>
                      {t('coll.size', { size: c.size })}
                    </span>
                  )}
                  <span className={'badge badge--' + badge.tone} title={t(badge.desc)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 3, fontSize: 9.5, pointerEvents: 'none' }}>
                    {t(badge.label)}
                  </span>
                  {c.highlightedAt && (
                    <span className="badge badge--warn" style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 3, fontSize: 9.5, pointerEvents: 'none', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      <StarIcon size={11} filled /> {t('hl.badge')}
                    </span>
                  )}
                </div>
                <div style={{ padding: '14px 16px 16px' }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, height: '2.5em', overflow: 'hidden' }}>
                    <Link to={'/vault/item/' + c.id} className="stretched-link" style={{ color: 'inherit' }}>
                      {name}
                    </Link>
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('vault.estimated')}</div>
                      <div className="mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
                        {value !== null ? money(value) : t('vault.pending')}
                      </div>
                    </div>
                    <span style={{ display: 'flex', gap: 6 }}>
                    <HighlightButton item={c} items={all} />
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={t('vault.export', { name })}
                      onClick={() => downloadVaultCard({ name, size: c.size, priceFmt: value !== null ? money(value) : '—', paid: t('vault.estimated'), gain: '', gainC: HEX.muted, glowA: glow, ...look, badgeLabel: t(badge.label), badgeColor: badge.color })}
                      style={{ position: 'relative', zIndex: 2, width: 32, height: 32, borderRadius: 8 }}
                    >
                      <DownloadIcon />
                    </button>
                    </span>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ScrollRow>
      {leagues.length > 1 && (
        <div role="group" aria-label={t('vault.byLeague')} className="coll-leagues">
          {[{ key: 'all', count: items.length, pic: undefined as string | undefined }, ...leagues].map((l) => (
            <button key={l.key} type="button" aria-pressed={active === l.key} onClick={() => setLeague(l.key)} className="coll-league">
              <span className="coll-league-disc">{l.pic ? <img src={l.pic} alt="" loading="lazy" /> : <span aria-hidden="true">👕</span>}</span>
              <span className="coll-league-name">{l.key === 'all' ? t('vault.allLeagues') : l.key === 'National Teams' ? t('lib.nations') : l.key === '?' ? t('vault.otherLeague') : l.key}</span>
              <span className="coll-league-count">{l.count}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
