import { sellerPayout } from '../../fees.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Card, KeyValueList, TextField } from '../../ui/index.ts';
import { marketValue } from '../catalog/model.ts';
import { useOrderBook } from '../market/queries.ts';
import { SelectedShirt } from './ShirtPickRow.tsx';
import type { SellFlow } from './useSellFlow.ts';

export function PriceStep({ f }: { f: SellFlow }) {
  const s = f.shirt!;
  const { money } = usePrefs();
  const book = useOrderBook(s.id, f.size).data ?? { bids: [], asks: [] };
  const market = marketValue(s, f.size);
  const lowAsk = book.asks[0] ? Number(book.asks[0].amount) : null;
  const topBid = book.bids[0] ? Number(book.bids[0].amount) : null;
  const sa = f.amount;
  const marks: [string, number, string][] = [['Market value', market, 'var(--warn)']];
  if (topBid) marks.push(['Highest bid', topBid, 'var(--text-2)']);
  if (lowAsk) marks.push(['Lowest ask', lowAsk, 'var(--accent)']);
  const vals = marks.map((m) => m[1]).concat(sa > 0 ? [sa] : []);
  const lo = Math.min(...vals) * 0.85;
  const hi = Math.max(...vals) * 1.15;
  const pos = (n: number) => Math.max(0, Math.min(100, ((n - lo) / (hi - lo || 1)) * 100)) + '%';
  const quick: [string, number][] = [...(topBid ? [['Sell now to top bid', topBid] as [string, number]] : []), ...(lowAsk ? [['Undercut lowest ask', Math.max(1, lowAsk - 1)] as [string, number]] : []), ['Market value', market]];
  const hint =
    sa <= 0 ? 'Enter an asking price.' : topBid && sa <= topBid ? `At or below the highest bid — this sells instantly at ${money(sa)}.` : lowAsk && sa < lowAsk ? 'Yours will be the lowest ask on the market.' : lowAsk ? `${money(sa - lowAsk)} above the lowest ask — expect a slower sale.` : `You’ll be the only seller in size ${f.size}.`;
  const payout = sellerPayout(sa);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, animation: 'kvIn .35s ease both' }}>
      <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SelectedShirt s={s} onChange={() => f.go(0)} />
        <TextField label="Your asking price" large inputMode="numeric" placeholder="0" autoFocus value={f.ask} onChange={(e) => f.setAsk(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} adornment={<span className="mono" style={{ fontSize: 20 }}>CHF</span>} hint={hint} style={{ fontFamily: 'var(--font-mono)' }} />
        <div role="group" aria-label="Suggested prices" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {quick.map(([l, n]) => (
            <button key={l} type="button" className="option-btn" onClick={() => f.setAsk(String(n))} style={{ flex: 1, minWidth: 120, padding: 12 }}>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{l}</span>
              <span className="mono" style={{ display: 'block', fontSize: 15, fontWeight: 600, marginTop: 2 }}>
                {money(n)}
              </span>
            </button>
          ))}
        </div>
        <Card style={{ padding: 22, borderRadius: 20 }} aria-label={`Market for size ${f.size}`}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 40 }}>Where you sit in the market · size {f.size}</div>
          <div style={{ position: 'relative', height: 6, borderRadius: 6, background: 'linear-gradient(90deg,rgba(255,255,255,0.08),rgba(75,255,139,0.3),rgba(255,255,255,0.08))', margin: '0 8px 44px' }}>
            {marks.map(([l, n, c]) => (
              <div key={l} style={{ position: 'absolute', left: pos(n), top: -4, width: 2, height: 14, background: c }}>
                <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
                  {l}
                  <div className="mono" style={{ color: c, fontSize: 11.5 }}>
                    {money(n)}
                  </div>
                </div>
              </div>
            ))}
            {sa > 0 && (
              <div style={{ position: 'absolute', left: pos(sa), top: -10, width: 26, height: 26, marginLeft: -13, borderRadius: '50%', background: 'var(--text)', border: '4px solid var(--bg)', boxShadow: '0 0 0 2px var(--text)', transition: 'left .3s' }}>
                <div className="mono" style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700, background: 'var(--text)', color: 'var(--bg)', padding: '3px 8px', borderRadius: 6 }}>
                  You · {money(sa)}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      <Card style={{ flex: '1 1 300px', minWidth: 0, alignSelf: 'flex-start' }}>
        <h2 className="title" style={{ margin: '0 0 10px' }}>
          Payout
        </h2>
        <KeyValueList rows={[['Your ask', money(sa)], ['Seller fee (8%)', '−' + money(payout.commission)], ['Authentication', 'Free'], ['Shipping to vault', 'Prepaid label']]} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14 }}>
          <span style={{ fontWeight: 600 }}>You earn</span>
          <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)' }}>
            {money(payout.payout)}
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>Released to you once the buyer confirms delivery of the authenticated shirt.</p>
      </Card>
    </div>
  );
}
