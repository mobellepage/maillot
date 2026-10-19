import { BUYER_SHIPPING_CHF, SELLER_AUTH_FEE_CHF, SELLER_FEE_RATE, sellerPayout } from '../../fees.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { Card, KeyValueList, TextField } from '../../ui/index.ts';
import { marketValue } from '../catalog/model.ts';
import { SelectedShirt } from './ShirtPickRow.tsx';
import type { SellFlow } from './useSellFlow.ts';

export function PriceStep({ f }: { f: SellFlow }) {
  const s = f.shirt!;
  const { money, t } = usePrefs();
  // Dealers on pilot terms pay their own rate; everyone else the standard one.
  const rate = useSession().profile?.commissionRate ?? SELLER_FEE_RATE;
  // A listing is a shirt in the collection, for sale: compared with the market value (a very good replica, this size).
  const market = marketValue(s, f.size);
  const sa = f.amount;
  const marks: [string, number, string][] = [[t('common.marketValue'), market, 'var(--warn)']];
  const vals = marks.map((m) => m[1]).concat(sa > 0 ? [sa] : []);
  const lo = Math.min(...vals) * 0.85;
  const hi = Math.max(...vals) * 1.15;
  const pos = (n: number) => Math.max(0, Math.min(100, ((n - lo) / (hi - lo || 1)) * 100)) + '%';
  const quick: [string, number][] = [
    [t('sell.quickBelow'), Math.max(1, Math.round((market * 0.95) / 5) * 5)],
    [t('common.marketValue'), market],
    [t('sell.quickAbove'), Math.round((market * 1.1) / 5) * 5]
  ];
  const diff = sa > 0 ? Math.round(((sa - market) / market) * 100) : 0;
  const hint = sa <= 0 ? t('sell.hint.enter') : diff === 0 ? t('sell.hint.atMarket') : diff < 0 ? t('sell.hint.belowMarket', { pct: -diff }) : t('sell.hint.aboveMarket', { pct: diff });
  const payout = sellerPayout(sa, rate);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, animation: 'kvIn .35s ease both' }}>
      <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SelectedShirt s={s} onChange={() => f.go(0)} />
        <TextField label={t('sell.askLabel')} large inputMode="numeric" placeholder="0" autoFocus value={f.ask} onChange={(e) => f.setAsk(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} adornment={<span className="mono" style={{ fontSize: 20 }}>CHF</span>} hint={hint} style={{ fontFamily: 'var(--font-mono)' }} />
        <div role="group" aria-label={t('sell.suggested')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {quick.map(([l, n]) => (
            <button key={l} type="button" className="option-btn" onClick={() => f.setAsk(String(n))} style={{ flex: 1, minWidth: 120, padding: 12 }}>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{l}</span>
              <span className="mono" style={{ display: 'block', fontSize: 15, fontWeight: 600, marginTop: 2 }}>
                {money(n)}
              </span>
            </button>
          ))}
        </div>
        <Card style={{ padding: 22, borderRadius: 20 }} aria-label={t('sell.marketFor', { size: f.size })}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 40 }}>{t('sell.whereYouSit', { size: f.size })}</div>
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
                  {t('sell.you', { price: money(sa) })}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      <Card style={{ flex: '1 1 300px', minWidth: 0, alignSelf: 'flex-start' }}>
        <h2 className="title" style={{ margin: '0 0 10px' }}>
          {t('sell.payout')}
        </h2>
        <KeyValueList
          rows={[
            [t('sell.yourAsk'), money(sa)],
            [t('sell.fee', { pct: Math.round(rate * 1000) / 10 }), '−' + money(payout.commission)],
            ...(f.needsFullPath ? [[t('sell.authFee'), '−' + money(SELLER_AUTH_FEE_CHF)] as [string, string]] : []),
            [t('sell.shipping'), '+' + money(BUYER_SHIPPING_CHF)]
          ]}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14 }}>
          <span style={{ fontWeight: 600 }}>{t('sell.youEarn')}</span>
          <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)' }}>
            {money(payout.payout + BUYER_SHIPPING_CHF - (f.needsFullPath ? SELLER_AUTH_FEE_CHF : 0))}
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>{t('sell.payoutNote')}</p>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 0', lineHeight: 1.5 }}>{t('trade.region')}</p>
      </Card>
    </div>
  );
}
