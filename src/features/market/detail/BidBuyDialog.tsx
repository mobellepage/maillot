// Buy now / place bid. Both go through the real order book: a buy is a bid at
// the lowest ask, and the server-side matcher (no self-trades, row locks)
// decides what happened. The result screen reports that outcome.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { Shirt } from '../../../data.ts';
import { buyerCheckoutFees } from '../../../fees.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { useSession } from '../../../lib/session.tsx';
import { useToast } from '../../../lib/toast.tsx';
import * as db from '../../../utils/db.ts';
import { Button, CheckIcon, Dialog, KeyValueList, ShirtGraphic, TextField, alpha } from '../../../ui/index.ts';
import { useOrderActions } from '../../orders/useOrders.ts';

const EXPIRY = [7, 14, 30, 60];

export interface BidBuyProps {
  mode: 'buy' | 'bid' | null;
  onClose: () => void;
  shirt: Shirt;
  size: string;
  lowestAsk: number | null;
  topBid: number | null;
  marketValue: number;
}

type Result = { kind: 'matched'; orderId: string; amount: number } | { kind: 'live'; amount: number } | null;

export function BidBuyDialog({ mode, onClose, shirt, size, lowestAsk, topBid, marketValue }: BidBuyProps) {
  const { money, t } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { pay } = useOrderActions();
  const [bid, setBid] = useState(() => String(topBid ? topBid + 5 : Math.round(marketValue * 0.88)));
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const close = () => {
    setResult(null);
    onClose();
  };
  const amount = mode === 'buy' ? lowestAsk ?? 0 : parseInt(bid, 10) || 0;
  const fees = buyerCheckoutFees(lowestAsk ?? 0);

  const submit = async () => {
    if (!amount || busy || !user) return;
    setBusy(true);
    try {
      const placed = await db.placeBid(user.id, shirt.id, size, amount, new Date(Date.now() + days * 864e5).toISOString());
      db.logEvent(user.id, shirt.id, mode === 'buy' ? 'buy' : 'bid').catch(() => {});
      const order = await db.findOrderForBid(placed.id);
      setResult(order ? { kind: 'matched', orderId: order.id, amount: Number(order.amount) } : { kind: 'live', amount });
      qc.invalidateQueries({ queryKey: ['orderBook', shirt.id] });
      qc.invalidateQueries({ queryKey: ['orders', user.id] });
    } catch {
      toast(t('toast.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const title = result ? (result.kind === 'matched' ? 'It’s a match' : 'Bid placed') : mode === 'buy' ? 'Buy now' : 'Place a bid';
  const hint =
    lowestAsk && amount >= lowestAsk
      ? `Your bid meets the lowest ask — it will execute instantly at ${money(lowestAsk)}.`
      : amount > (topBid ?? 0)
        ? (topBid ? 'You’ll be the highest bidder.' : 'You’ll be the first bidder in this size.') + ' Sellers see your bid immediately.'
        : `Below the current highest bid (${money(topBid ?? 0)}).`;

  return (
    <Dialog open={!!mode} onClose={close} title={title}>
      {result ? (
        <div style={{ textAlign: 'center', padding: '4px 4px 0' }}>
          <div aria-hidden="true" style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 18px', background: 'var(--accent-soft)', border: '2px solid var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
            <CheckIcon size={30} />
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.55, margin: '0 0 24px', textWrap: 'pretty' }}>
            {result.kind === 'matched'
              ? `A seller accepted at ${money(result.amount)}. Pay now to lock it in — your money is held in escrow until the shirt has passed authentication and you confirm delivery.`
              : `Your bid of ${money(result.amount)} for ${shirt.name} (size ${size}) is live for ${days} days. If a seller meets it, we’ll notify you to complete payment.`}
          </p>
          {result.kind === 'matched' && (
            <Button block size="lg" busy={pay.isPending} busyLabel="Opening checkout…" onClick={() => pay.mutate(result.orderId)} style={{ marginBottom: 10 }}>
              Pay now
            </Button>
          )}
          <Button block variant="ghost" onClick={close}>
            {result.kind === 'matched' ? 'Pay later from Orders' : 'Done'}
          </Button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderRadius: 16, background: 'var(--sunken)', border: '1px solid var(--line)', marginBottom: 22 }}>
            <span style={{ width: 64, height: 64, borderRadius: 12, display: 'grid', placeItems: 'center', flex: 'none', background: `radial-gradient(circle,${alpha(shirt.glow, 0.34)},rgba(0,0,0,0) 70%),var(--bg)` }}>
              <ShirtGraphic pat={shirt.pat} trim={shirt.trim} crest={shirt.crest} flat style={{ width: '80%' }} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{shirt.name}</span>
              <span className="mono" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Size {size} · {shirt.cond}
              </span>
            </span>
          </div>

          {mode === 'buy' ? (
            <>
              <KeyValueList rows={[[`Lowest ask · size ${size}`, money(lowestAsk ?? 0)], ['Authentication (Zürich)', money(fees.authFee)], ['Insured shipping', money(fees.shipping)]]} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <span style={{ fontWeight: 600 }}>Total</span>
                <span className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
                  {money(fees.total)}
                </span>
              </div>
            </>
          ) : (
            <>
              <TextField label="Your bid (CHF)" large inputMode="numeric" value={bid} onChange={(e) => setBid(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} adornment={<span className="mono">CHF</span>} hint={hint} style={{ fontFamily: 'var(--font-mono)' }} />
              <div role="group" aria-label="Quick amounts" style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {[topBid ? ['Beat highest bid', topBid + 1] : ['Market value', marketValue], ['Strong bid', Math.round(((topBid ?? marketValue * 0.88) + (lowestAsk ?? marketValue)) / 2)], lowestAsk ? ['Buy at lowest ask', lowestAsk] : ['Opening bid', Math.round(marketValue * 0.88)]].map(([k, n]) => (
                  <button key={k} type="button" className="option-btn" onClick={() => setBid(String(n))} style={{ flex: 1, minWidth: 110, padding: 10 }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{k}</span>
                    <span className="mono" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                      {money(Number(n))}
                    </span>
                  </button>
                ))}
              </div>
              <fieldset style={{ border: 0, padding: 0, margin: '20px 0 0' }}>
                <legend className="mono" style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Bid expires in
                </legend>
                <div style={{ display: 'flex', gap: 6 }}>
                  {EXPIRY.map((d) => (
                    <button key={d} type="button" className="option-btn" aria-pressed={days === d} onClick={() => setDays(d)} style={{ flex: 1, height: 42, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                      {d} days
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 20, padding: 14, borderRadius: 14, background: 'var(--sunken)', border: '1px solid var(--line)', fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>
            <span aria-hidden="true" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              ✓
            </span>
            <span>
              Pay securely with TWINT, card or Apple Pay. Your money is held in escrow and only released once the shirt has passed authentication and you confirm delivery.{' '}
              <Link to="/authentication" onClick={close}>
                How authentication works
              </Link>
            </span>
          </div>
          {user ? (
            <Button block size="lg" busy={busy} busyLabel={mode === 'buy' ? 'Matching…' : 'Placing bid…'} disabled={!amount} onClick={submit} style={{ marginTop: 18 }}>
              {mode === 'buy' ? 'Confirm purchase · ' + money(fees.total) : 'Place bid · ' + money(amount)}
            </Button>
          ) : (
            <Link to="/signin" state={{ from: '/shirt/' + shirt.id, notice: 'auth.signInToTrade' }} className="btn btn--primary btn--lg btn--block" style={{ marginTop: 18 }}>
              Sign in to continue
            </Link>
          )}
        </>
      )}
    </Dialog>
  );
}
