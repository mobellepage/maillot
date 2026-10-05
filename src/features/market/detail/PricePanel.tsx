import { Link } from 'react-router';
import { pct, type Shirt } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Button, ButtonLink, Notice, ShieldIcon, StatTile, WatchButton } from '../../../ui/index.ts';
import type { OrderBook, ShirtStats } from '../../../utils/db.ts';
import { marketValue } from '../../catalog/model.ts';

export interface PricePanelProps {
  s: Shirt;
  size: string;
  setSize: (z: string) => void;
  book: OrderBook;
  myUserId: string | undefined;
  stats: ShirtStats | null | undefined;
  watched: boolean;
  toggleWatch: () => void;
  openBuy: () => void;
  openBid: () => void;
  /** The live order book failed to load: say so instead of showing "no asks". */
  bookError?: boolean;
  retryBook?: () => void;
}

export function PricePanel({ s, size, setSize, book, myUserId, stats, watched, toggleWatch, openBuy, openBid, bookError, retryBook }: PricePanelProps) {
  const { money, t, tp, label } = usePrefs();
  const liveAsk = book.asks.find((a) => a.user_id !== myUserId) ?? null;
  const myAsk = myUserId ? book.asks.find((a) => a.user_id === myUserId) : undefined;
  const liveBid = book.bids[0] ?? null;
  const watchers = stats ? Number(stats.watchers) : 0;
  const listings = stats ? Number(stats.live_listings) : 0;
  const unique = s.type === 'Match-worn';

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
          {pct(s.ch)} · 30D
        </span>
        <span>{watchers ? tp('pp.watching', watchers) : t('pp.firstWatch')}</span>
        <span aria-hidden="true" style={{ color: 'var(--faint-2)' }}>
          •
        </span>
        <span>{listings ? tp('pp.listed', listings) : t('pp.noListings')}</span>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: '30px 0 0' }}>
        <legend style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, padding: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t('pp.size')}</span>
          <span style={{ fontSize: 12.5, color: unique ? 'var(--warn)' : 'var(--muted)', marginLeft: 'auto' }}>{unique ? t('pp.unique') : t('pp.bySize')}</span>
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
        <StatTile label={t('pp.lowestAsk')} live={!!liveAsk} highlight={!!liveAsk} value={liveAsk ? money(Number(liveAsk.amount)) : '—'} sub={liveAsk ? tp('pp.listings', book.asks.length) : t('pp.noSellers')} />
        <StatTile label={t('pp.highestBid')} value={liveBid ? money(Number(liveBid.amount)) : '—'} sub={liveBid ? tp('pp.bids', book.bids.length) : t('pp.noBids')} />
        <StatTile label={t('common.marketValue')} value={money(marketValue(s, size))} sub={s.priceSource === 'trades' ? tp('pp.fromSales', s.trades.count) : t('pp.estimate')} />
      </div>
      {myAsk && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-2)' }}>
          {t('pp.yourAsk')} <span className="mono">{money(Number(myAsk.amount))}</span>
        </div>
      )}

      {bookError && (
        <Notice tone="warn" style={{ marginTop: 14 }}>
          {t('pp.bookError')}{' '}
          <button type="button" className="link-btn" onClick={retryBook}>
            {t('common.tryAgain')}
          </button>
        </Notice>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        {liveAsk ? (
          <Button size="lg" onClick={openBuy} style={{ flex: 1.3 }}>
            {t('pp.buyNow', { price: money(Number(liveAsk.amount)) })}
          </Button>
        ) : (
          <Button size="lg" onClick={openBid} style={{ flex: 1.3 }}>
            {t('pp.placeBid')}
          </Button>
        )}
        {liveAsk ? (
          <Button size="lg" variant="secondary" onClick={openBid} style={{ flex: 1 }}>
            {t('pp.placeBid')}
          </Button>
        ) : (
          <ButtonLink size="lg" variant="secondary" to={`/sell?shirt=${s.id}&size=${size}`} style={{ flex: 1 }}>
            {t('pp.sellYours')}
          </ButtonLink>
        )}
        <WatchButton watched={watched} onToggle={toggleWatch} name={s.name} size={58} style={{ borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.14)', background: 'none' }} />
      </div>

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
