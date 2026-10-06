// /developers — the data API: what it returns, how to authenticate, plans.
// Keys are issued by Maillot admins (Admin → API keys); access is requested
// by email for now.
import { Link } from 'react-router';
import { COMPANY } from '../../config/company.ts';
import { API_BASE, API_PLANS } from '../../config/api.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { ButtonLink, Card, Page, SectionHeader } from '../../ui/index.ts';

const LIST_EXAMPLE = `{
  "shirts": [
    {
      "shirt_id": "nap-8788",
      "name": "SSC Napoli 1987/88 Home",
      "type": "Retro",
      "league": "Serie A",
      "index_price": 380,
      "change_30d_pct": 14,
      "market_price": 380,
      "price_source": "estimate",
      "completed_sales": 0,
      "last_price": null,
      "last_sold_at": null
    }
  ],
  "currency": "CHF",
  "generated_at": "2026-10-05T09:00:00.000Z"
}`;

const SHIRT_EXAMPLE = `{
  "shirt_id": "nap-8788",
  "sales": { "count": 12, "avg": 371.5, "min": 330, "max": 420,
             "last_price": 395, "last_sold_at": "2026-10-02T14:11:09Z" },
  "order_book": { "best_bid": 360, "best_ask": 399, "open_bids": 4, "open_asks": 2 },
  "generated_at": "2026-10-05T09:00:00.000Z"
}`;

function Code({ children, label }: { children: string; label: string }) {
  return (
    // Wide code scrolls sideways, so it takes keyboard focus to be scrollable.
    <pre role="region" aria-label={label} tabIndex={0} className="mono" style={{ margin: 0, padding: 16, borderRadius: 12, background: 'var(--sunken)', border: '1px solid var(--line)', fontSize: 12.5, lineHeight: 1.55, overflowX: 'auto' }}>
      {children}
    </pre>
  );
}

export default function DevelopersPage() {
  usePageMeta('Data API', 'Football shirt prices as data: the Maillot Shirt Index, completed sales and live order books via a simple JSON API.');
  const mail = `mailto:${COMPANY.email}?subject=${encodeURIComponent('Maillot data API access')}`;
  return (
    <Page style={{ maxWidth: 920 }}>
      <SectionHeader level={1} size="lg" eyebrow="Developers" title="Shirt prices as data" />
      <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', margin: '-8px 0 0' }}>
        The <Link to="/price-index">Maillot Shirt Index</Link>, completed sales and live order books as JSON — for insurers valuing a collection, auction houses
        setting estimates, or apps that show what a shirt is worth.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <a className="btn btn--primary btn--sm" href={mail}>
          Request an API key
        </a>
        <ButtonLink to="/price-index" variant="ghost" size="sm">
          See the index report
        </ButtonLink>
      </div>

      <section aria-labelledby="auth-title" style={{ marginTop: 44 }}>
        <h2 id="auth-title" className="title">
          Authentication
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)' }}>
          Send your key in the <code className="mono">x-api-key</code> header (or as <code className="mono">Authorization: Bearer …</code>). Keys look like{' '}
          <code className="mono">mlt_xxxxxxxx.…</code>; we only store a hash, so keep yours somewhere safe. Revoked or unknown keys get <code className="mono">401</code>.
        </p>
        <Code label="Example request">{`curl "${API_BASE}" \\\n  -H "x-api-key: mlt_xxxxxxxx.your-secret"`}</Code>
      </section>

      <section aria-labelledby="ep-title" style={{ marginTop: 40 }}>
        <h2 id="ep-title" className="title">
          Endpoints
        </h2>
        <div style={{ display: 'grid', gap: 22 }}>
          <div>
            <h3 style={{ fontSize: 15, margin: '0 0 6px' }}>
              <code className="mono">GET /price-index</code>
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 10px' }}>
              Every tracked shirt with its index price, 30-day change and market price. <code className="mono">price_source</code> says whether the market price comes
              from completed sales on Maillot (<code className="mono">trades</code>) or our estimate.
            </p>
            <Code label="List response">{LIST_EXAMPLE}</Code>
          </div>
          <div>
            <h3 style={{ fontSize: 15, margin: '0 0 6px' }}>
              <code className="mono">GET /price-index?shirt_id=&lt;id&gt;</code>
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 10px' }}>
              One shirt: statistics over its last 200 completed sales and the current order book. Shirt ids are the ones in the list response.
            </p>
            <Code label="Single shirt response">{SHIRT_EXAMPLE}</Code>
          </div>
        </div>
      </section>

      <section aria-labelledby="plans-title" style={{ marginTop: 44 }}>
        <h2 id="plans-title" className="title">
          Plans
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginTop: 12 }}>
          {API_PLANS.map((p) => (
            <Card key={p.name} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>{p.name}</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{p.who}</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-2)', flex: 1 }}>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a className="btn btn--ghost btn--sm" href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(`Maillot data API — ${p.name}`)}`}>
                Ask about {p.name}
              </a>
            </Card>
          ))}
        </div>
      </section>
    </Page>
  );
}
