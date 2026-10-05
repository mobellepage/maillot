// The catalogue card used on Home, Browse, Detail ("you might also like")
// and the watchlist. The whole card is clickable through a stretched <Link>
// (a real anchor, so it can be opened in a new tab and crawled); the heart is
// a separate button layered above it, not nested inside the link.
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { HeartIcon } from './icons.tsx';
import { usePrefs } from '../lib/prefs.tsx';
import { ShirtGraphic, type ShirtLook } from './ShirtGraphic.tsx';

export interface ShirtCardModel {
  id: string;
  name: string;
  brand: string;
  season: string;
  /** Message key (e.g. tag.newSeason, type.Retro) */
  tag: string;
  look: ShirtLook;
  glow: string;
  priceFmt: string;
  chFmt: string;
  up: boolean;
}

export function ShirtCard({ s, watched, onToggleWatch, priceLabel }: { s: ShirtCardModel; watched: boolean; onToggleWatch: (id: string) => void; priceLabel?: string }) {
  const { t } = usePrefs();
  return (
    <article className="card card--interactive shirt-card" style={{ padding: 0, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'relative', aspectRatio: '1/1', display: 'grid', placeItems: 'center', background: `radial-gradient(circle at 50% 46%,${s.glow} 0%,rgba(0,0,0,0) 62%),var(--sunken)` }}>
        <span className="badge badge--neutral" style={{ position: 'absolute', top: 10, left: 10, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 6, background: 'var(--overlay)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {t(s.tag)}
        </span>
        <ShirtGraphic {...s.look} style={{ width: '68%' }} />
      </div>
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s.brand} · {s.season}
        </div>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, height: '2.5em', overflow: 'hidden' }}>
          <Link to={'/shirt/' + s.id} className="stretched-link" style={{ color: 'inherit' }}>
            {s.name}
          </Link>
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{priceLabel ?? t('common.marketValue')}</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {s.priceFmt}
            </div>
          </div>
          <span className={'badge ' + (s.up ? 'badge--accent' : 'badge--neg')} style={{ borderRadius: 6, fontSize: 11.5 }} aria-label={'30-day change ' + s.chFmt}>
            {s.chFmt}
          </span>
        </div>
      </div>
      <WatchButton watched={watched} onToggle={() => onToggleWatch(s.id)} name={s.name} style={{ position: 'absolute', top: 6, right: 6 }} />
    </article>
  );
}

export function WatchButton({ watched, onToggle, name, style, size = 36 }: { watched: boolean; onToggle: () => void; name: string; style?: CSSProperties; size?: number }) {
  const { t } = usePrefs();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={watched}
      aria-label={t('card.watch', { name })}
      className="watch-btn"
      style={{ width: size, height: size, color: watched ? 'var(--accent)' : 'var(--text)', ...style }}
    >
      <HeartIcon size={15} filled={watched} />
    </button>
  );
}
