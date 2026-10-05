import { Link } from 'react-router';
import { pct, type Shirt } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Button, ButtonLink, ShieldIcon, StatTile, WatchButton } from '../../../ui/index.ts';
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
}

export function PricePanel({ s, size, setSize, book, myUserId, stats, watched, toggleWatch, openBuy, openBid }: PricePanelProps) {
  const { money } = usePrefs();
  const liveAsk = book.asks.find((a) => a.user_id !== myUserId) ?? null;
  const myAsk = myUserId ? book.asks.find((a) => a.user_id === myUserId) : undefined;
  const liveBid = book.bids[0] ?? null;
  const watchers = stats ? Number(stats.watchers) : 0;
  const listings = stats ? Number(stats.live_listings) : 0;
  const unique = s.type === 'Match-worn';

  return (
    <div style={{ flex: '1 1 400px', minWidth: 0 }}>
      <div className="mono" style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {s.brand} · {s.season} · {s.league}
      </div>
      <h1 className="display" style={{ margin: '12px 0 0', fontSize: 'clamp(32px,4.2vw,54px)' }}>
        {s.name}
      </h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', marginTop: 16, fontSize: 13.5, color: 'var(--text-2)' }}>
        <span className={'badge ' + (s.ch >= 0 ? 'badge--accent' : 'badge--neg')} style={{ borderRadius: 7, fontSize: 12.5 }}>
          {pct(s.ch)} · 30D
        </span>
        <span>{watchers ? watchers.toLocaleString('de-CH') + ' watching' : 'Be the first to watch'}</span>
        <span aria-hidden="true" style={{ color: 'var(--faint-2)' }}>
          •
        </span>
        <span>{listings ? listings + ' listed' : 'No listings yet'}</span>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: '30px 0 0' }}>
        <legend style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, padding: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Size</span>
          <span style={{ fontSize: 12.5, color: unique ? 'var(--warn)' : 'var(--muted)', marginLeft: 'auto' }}>{unique ? 'Unique player-issue item' : 'Market value by size'}</span>
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
        <StatTile label="Lowest ask" live={!!liveAsk} highlight={!!liveAsk} value={liveAsk ? money(Number(liveAsk.amount)) : '—'} sub={liveAsk ? book.asks.length + (book.asks.length === 1 ? ' listing' : ' listings') : 'No sellers yet'} />
        <StatTile label="Highest bid" value={liveBid ? money(Number(liveBid.amount)) : '—'} sub={liveBid ? book.bids.length + (book.bids.length === 1 ? ' bid' : ' bids') : 'No bids yet'} />
        <StatTile label="Market value" value={money(marketValue(s, size))} sub={s.priceSource === 'trades' ? 'From ' + s.trades.count + (s.trades.count === 1 ? ' sale' : ' sales') + ' on Maillot' : 'Index estimate'} />
      </div>
      {myAsk && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-2)' }}>
          Your ask in this size: <span className="mono">{money(Number(myAsk.amount))}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        {liveAsk ? (
          <Button size="lg" onClick={openBuy} style={{ flex: 1.3 }}>
            Buy now · {money(Number(liveAsk.amount))}
          </Button>
        ) : (
          <Button size="lg" onClick={openBid} style={{ flex: 1.3 }}>
            Place bid
          </Button>
        )}
        {liveAsk ? (
          <Button size="lg" variant="secondary" onClick={openBid} style={{ flex: 1 }}>
            Place bid
          </Button>
        ) : (
          <ButtonLink size="lg" variant="secondary" to={`/sell?shirt=${s.id}&size=${size}`} style={{ flex: 1 }}>
            Sell yours
          </ButtonLink>
        )}
        <WatchButton watched={watched} onToggle={toggleWatch} name={s.name} size={58} style={{ borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.14)', background: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 18, padding: 16, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <span aria-hidden="true" style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
          <ShieldIcon />
        </span>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>
          <strong style={{ color: 'var(--text)' }}>14-point authentication in Zürich.</strong> Every shirt is inspected by our team before it ships to you. Not as described? Full refund. <Link to="/authentication">How it works →</Link>
        </p>
      </div>
    </div>
  );
}
