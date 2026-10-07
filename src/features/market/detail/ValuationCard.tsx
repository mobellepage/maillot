// "Market value" on the product page: the valuation model's value and range,
// how sure it is and why — MAILLOT sales, comparable offers on other
// marketplaces (with links) and related shirts.
import { useQuery } from '@tanstack/react-query';
import type { Shirt } from '../../../data.ts';
import { formatDate } from '../../../lib/format.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import * as db from '../../../utils/db.ts';
import { Badge, Card } from '../../../ui/index.ts';

const MARKET_NAMES: Record<string, string> = { EBAY_DE: 'eBay.de', EBAY_GB: 'eBay.co.uk', EBAY_FR: 'eBay.fr', EBAY_IT: 'eBay.it' };

/** Where the value sits within its range, as a percentage for the bar. */
const positionInRange = (low: number, value: number, high: number) => (high > low ? Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100)) : 50);

export function ValuationCard({ s }: { s: Shirt }) {
  const { t, tp, money, lang } = usePrefs();
  const v = s.valuation;
  const comps = useQuery({ queryKey: ['comps', s.id], queryFn: () => db.loadComps(s.id), staleTime: 10 * 60 * 1000, enabled: !!v && v.nExact + v.nSimilar > 0 });
  const evidence = v ? v.nTrades + v.nExact + v.nSimilar : 0;

  return (
    <section aria-labelledby="valuation-title" style={{ marginTop: 'clamp(36px,5vw,64px)' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 id="valuation-title" style={{ fontSize: 18 }}>
            {t('val.title')}
          </h2>
          {v && evidence > 0 && <Badge tone={v.confidence === 'high' ? 'accent' : 'neutral'}>{t('val.conf.' + v.confidence)}</Badge>}
        </div>

        <div className="mono" style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, marginTop: 10 }}>
          {money(s.price)}
        </div>
        {v && (
          <>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 2 }}>{t('val.range', { low: money(v.low), high: money(v.high) })}</div>
            <div aria-hidden="true" style={{ position: 'relative', height: 6, borderRadius: 6, background: 'linear-gradient(90deg,var(--accent-soft),var(--accent-line),var(--accent-soft))', margin: '14px 0 4px' }}>
              <span style={{ position: 'absolute', top: -4, left: `calc(${positionInRange(v.low, v.value, v.high)}% - 7px)`, width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 3px var(--surface)' }} />
            </div>
          </>
        )}

        {evidence > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 4, fontSize: 13.5, color: 'var(--text-2)' }}>
            {v!.nTrades > 0 && <li>• {tp('val.sales', v!.nTrades)}</li>}
            {v!.nExact > 0 && <li>• {tp('val.comps', v!.nExact)}</li>}
            {v!.nSimilar > 0 && <li>• {tp('val.similar', v!.nSimilar)}</li>}
          </ul>
        ) : (
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 12 }}>{t('val.noEvidence')}</p>
        )}

        {comps.data && comps.data.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>{t('val.compsTitle')}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {comps.data.slice(0, 6).map((c) => (
                <li key={c.source + c.external_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {MARKET_NAMES[c.marketplace] ?? c.marketplace} · {c.match === 'similar' ? t('val.related') : t('val.exact')}
                    </div>
                  </div>
                  <span className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {money(Number(c.price_chf))}
                  </span>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="btn btn--ghost btn--sm" aria-label={`${t('val.view')}: ${c.title}`}>
                      {t('val.view')}
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{t('val.askNote')}</p>
          </div>
        )}

        <details style={{ marginTop: 16, fontSize: 13 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text-2)' }}>{t('val.howTitle')}</summary>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.55, marginTop: 8 }}>{t('val.how')}</p>
        </details>
        {v && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>{t('val.updated', { date: formatDate(v.computedAt, lang) })}</p>}
      </Card>
    </section>
  );
}
