import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import type { CustomItem } from '../../types/domain.ts';
import { downloadVaultCard } from '../../utils/cardExport.js';
import { ButtonLink, DownloadIcon, EmptyState, ErrorState, Notice, ShirtGraphic, Skeleton, HEX } from '../../ui/index.ts';
import { badgeFor, itemLook, itemName, valueOf } from './model.ts';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';

export function CollectionTab({ items, loading, error, onRetry }: { items: CustomItem[]; loading?: boolean; error?: boolean; onRetry?: () => void }) {
  const { money, t, tp } = usePrefs();
  const rejected = items.filter((c) => c.verification.status === 'abgelehnt');
  const cover = usePhotoUrls(items.map((c) => c.photos?.front), true);
  if (loading)
    return (
      <div className="grid-cards" style={{ marginTop: 24 }} aria-busy="true" aria-label={t('vault.loading')}>
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
        {items.map((c) => {
          const badge = badgeFor(c);
          const { look, glow } = itemLook(c);
          const value = valueOf(c);
          const name = itemName(c);
          const photo = cover(c.photos?.front);
          return (
            <li key={c.id}>
              <article className="card card--interactive" style={{ position: 'relative', padding: 0, borderRadius: 22, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1/1.08', display: 'grid', placeItems: 'center', position: 'relative', background: `radial-gradient(circle at 50% 46%,${glow},rgba(0,0,0,0) 62%),var(--sunken)` }}>
                  <span className="mono" style={{ position: 'absolute', top: 12, left: 12, zIndex: 1, fontSize: 10.5, color: 'var(--text-2)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    SIZE {c.size}
                  </span>
                  <span className={'badge badge--' + badge.tone} title={t(badge.desc)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 1, fontSize: 9.5 }}>
                    {t(badge.label)}
                  </span>
                  {photo ? <img src={photo} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShirtGraphic {...look} style={{ width: '66%' }} />}
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
