import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import type { CustomItem } from '../../types/domain.ts';
import { downloadVaultCard } from '../../utils/cardExport.js';
import { ButtonLink, DownloadIcon, EmptyState, ErrorState, Notice, ShirtGraphic, Skeleton, HEX } from '../../ui/index.ts';
import { badgeFor, itemLook, itemName, valueOf } from './model.ts';
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

export function CollectionTab({ items, loading, error, onRetry }: { items: CustomItem[]; loading?: boolean; error?: boolean; onRetry?: () => void }) {
  const { money, t, tp } = usePrefs();
  const rejected = items.filter((c) => c.verification.status === 'abgelehnt');
  const shots = items.map(photosOf);
  const url = usePhotoUrls(shots.flat().map((x) => x.photo), true);
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
      <ul className="grid-cards" style={{ listStyle: 'none', padding: 0, margin: '24px 0 0', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,200px),1fr))' }}>
        {items.map((c, i) => {
          const badge = badgeFor(c);
          const { look, glow } = itemLook(c);
          const value = valueOf(c);
          const name = itemName(c);
          const slides = shots[i]!.map((x) => ({ src: url(x.photo), cutout: isCutout(x.key) })).filter((x): x is { src: string; cutout: boolean } => !!x.src);
          return (
            <li key={c.id}>
              <article className="card card--interactive" style={{ position: 'relative', padding: 0, borderRadius: 22, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1/1.08', display: 'grid', placeItems: 'center', position: 'relative', background: `radial-gradient(circle at 50% 46%,${glow},rgba(0,0,0,0) 62%),var(--sunken)` }}>
                  {slides.length ? (
                    <PhotoStrip slides={slides} to={'/vault/item/' + c.id} label={name} prevLabel={t('common.scrollPrev')} nextLabel={t('common.scrollNext')} />
                  ) : c.kitImage ? (
                    <PendingPhotos src={c.kitImage} />
                  ) : (
                    <ShirtGraphic {...look} style={{ width: '66%' }} />
                  )}
                  {c.size && (
                    <span className="badge badge--neutral" style={{ position: 'absolute', top: 12, left: 12, zIndex: 3, fontSize: 9.5, pointerEvents: 'none' }}>
                      {t('coll.size', { size: c.size })}
                    </span>
                  )}
                  <span className={'badge badge--' + badge.tone} title={t(badge.desc)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 3, fontSize: 9.5, pointerEvents: 'none' }}>
                    {t(badge.label)}
                  </span>
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
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={t('vault.export', { name })}
                      onClick={() => downloadVaultCard({ name, size: c.size, priceFmt: value !== null ? money(value) : '—', paid: t('vault.estimated'), gain: '', gainC: HEX.muted, glowA: glow, ...look, badgeLabel: t(badge.label), badgeColor: badge.color })}
                      style={{ position: 'relative', zIndex: 2, width: 32, height: 32, borderRadius: 8 }}
                    >
                      <DownloadIcon />
                    </button>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}
