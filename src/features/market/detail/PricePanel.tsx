import { Link } from 'react-router';
import { pct, type Shirt } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { ButtonLink, ShieldIcon, StatTile, WatchButton } from '../../../ui/index.ts';
import type { ShirtStats } from '../../../utils/db.ts';
import { marketValue } from '../../catalog/model.ts';
import { AlertButton } from './AlertButton.tsx';

export interface PricePanelProps {
  s: Shirt;
  size: string;
  setSize: (z: string) => void;
  stats: ShirtStats | null | undefined;
  watched: boolean;
  toggleWatch: () => void;
  /** Exemplars of this model in members' collections (the marketplace). */
  inCollections?: { total: number; buyable: number };
}

/**
 * The model's price panel: the market value (a very good replica) by size,
 * and the way to the actual shirts — the ones in collections, to buy or ask
 * for, on the marketplace. No order book: listings are shirts in collections.
 */
export function PricePanel({ s, size, setSize, stats, watched, toggleWatch, inCollections }: PricePanelProps) {
  const { money, t, tp, label } = usePrefs();
  const watchers = stats ? Number(stats.watchers) : 0;
  const total = inCollections?.total ?? 0;
  const buyable = inCollections?.buyable ?? 0;

  return (
    <div style={{ flex: '1 1 400px', minWidth: 0 }}>
      <div className="mono" style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {s.brand} · {s.season} · {label('league', s.league)}
      </div>
      <h1 className="display" style={{ margin: '12px 0 0', fontSize: 'clamp(32px,4.2vw,54px)' }}>
        {s.name}
      </h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', marginTop: 16, fontSize: 13.5, color: 'var(--text-2)' }}>
        <span className={'badge ' + (s.ch >= 0 ? 'badge--accent' : 'badge--neg')} style={{ borderRadius: 7, fontSize: 12.5 }}>
          {t('pp.index30', { pct: pct(s.ch) })}
        </span>
        <span>{watchers ? tp('pp.watching', watchers) : t('pp.firstWatch')}</span>
        <span aria-hidden="true" style={{ color: 'var(--faint-2)' }}>
          •
        </span>
        <span>{total ? <Link to={`/market?shirt=${s.id}`}>{t('pp.inCollections', { n: total, b: buyable })}</Link> : t('pp.noneInCollections')}</span>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: '30px 0 0' }}>
        <legend style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, padding: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t('pp.size')}</span>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', marginLeft: 'auto' }}>{t('pp.bySize')}</span>
        </legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(78px,1fr))', gap: 8 }}>
          {s.sizes.map((z) => (
            <button key={z} type="button" className="option-btn" aria-pressed={z === size} onClick={() => setSize(z)} style={{ padding: '10px 6px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 15 }}>{z}</span>
              <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>
                {money(marketValue(s, z))}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginTop: 20 }}>
        <StatTile label={t('common.marketValue')} value={money(marketValue(s, size))} sub={s.priceSource === 'market' && s.valuation ? tp('pp.fromMarket', s.valuation.nTrades + s.valuation.nExact + s.valuation.nSimilar) : s.priceSource === 'trades' ? tp('pp.fromSales', s.trades.count) : t('pp.estimate')} />
        <StatTile label={t('pp.inColl')} value={String(total)} sub={t('pp.inCollSub')} />
        <StatTile label={t('pp.toBuy')} value={String(buyable)} highlight={buyable > 0} sub={t('pp.toBuySub')} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <ButtonLink size="lg" to={buyable ? `/market?shirt=${s.id}&status=buyable` : `/market?shirt=${s.id}`} style={{ flex: 1.3 }}>
          {buyable ? tp('pp.seeBuyable', buyable) : t('pp.seeInCollections')}
        </ButtonLink>
        <ButtonLink size="lg" variant="secondary" to={`/sell?shirt=${s.id}&size=${size}`} style={{ flex: 1 }}>
          {t('pp.sellYours')}
        </ButtonLink>
        <WatchButton watched={watched} onToggle={toggleWatch} name={s.name} size={58} style={{ borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.14)', background: 'none' }} />
      </div>
      <AlertButton s={s} size={size} />

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 18, padding: 16, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <span aria-hidden="true" style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
          <ShieldIcon />
        </span>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>
          <strong style={{ color: 'var(--text)' }}>{t('pp.authTitle')}</strong> {t('pp.authBody')} <Link to="/authentication">{t('pp.howItWorks')}</Link>
        </p>
      </div>
    </div>
  );
}
