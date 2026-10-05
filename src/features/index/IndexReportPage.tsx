// /price-index — the monthly Maillot Shirt Index report: composite, segment
// moves, biggest movers and the full table, with methodology and CSV export.
// Computed from the live catalogue in the browser; the same numbers are
// available to licensees through the data API (/developers).
import { useState } from 'react';
import { Link } from 'react-router';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useCatalog } from '../catalog/useCatalog.ts';
import { Button, ButtonLink, Card, Page, SectionHeader, StatTile } from '../../ui/index.ts';
import { composite, segments, toCsv, type IndexInput, type Segment } from './indexMath.ts';

const pct = (n: number) => (n > 0 ? '+' : '') + n.toFixed(1) + '%';
const tone = (n: number) => (n > 0 ? 'var(--accent)' : n < 0 ? 'var(--neg)' : 'var(--muted)');

function SegmentTable({ title, rows }: { title: string; rows: Segment[] }) {
  const { money } = usePrefs();
  return (
    <Card>
      <h3 className="title" style={{ margin: '0 0 12px' }}>
        {title}
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
            <th style={{ fontWeight: 500, padding: '6px 0' }}>Segment</th>
            <th style={{ fontWeight: 500, textAlign: 'right' }}>Shirts</th>
            <th style={{ fontWeight: 500, textAlign: 'right' }}>Avg. price</th>
            <th style={{ fontWeight: 500, textAlign: 'right' }}>30 days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.name} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '8px 0' }}>{s.name}</td>
              <td className="mono" style={{ textAlign: 'right' }}>
                {s.count}
              </td>
              <td className="mono" style={{ textAlign: 'right' }}>
                {money(s.avgPrice)}
              </td>
              <td className="mono" style={{ textAlign: 'right', color: tone(s.change) }}>
                {pct(s.change)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function IndexReportPage() {
  const { shirts } = useCatalog(); // re-renders when the live catalogue loads
  const { money, lang } = usePrefs();
  const [today] = useState(() => new Date());
  usePageMeta('Maillot Shirt Index', 'Monthly price index for collectable football shirts: composite, segments, biggest movers and methodology.');
  const rows: IndexInput[] = shirts.map((s) => ({ id: s.id, name: s.name, league: s.league, type: s.type, price: s.price, ch: s.ch, priceSource: s.priceSource }));
  const c = composite(rows);
  const byType = segments(rows, 'type');
  const byLeague = segments(rows, 'league');
  const sorted = [...rows].sort((a, b) => b.ch - a.ch);
  const month = today.toLocaleDateString(lang === 'de' ? 'de-CH' : 'en-GB', { month: 'long', year: 'numeric' });

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `maillot-shirt-index-${today.toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Page>
      <SectionHeader level={1} size="lg" eyebrow={`Report · ${month}`} title="Maillot Shirt Index" />
      <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', margin: '-8px 0 0' }}>
        How the market for collectable football shirts moved over the last 30 days, across the {c.count} shirts we track. Prices in your display currency.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 28 }}>
        <StatTile highlight label="Index, 30 days" value={<span style={{ color: tone(c.change) }}>{pct(c.change)}</span>} sub="value-weighted" />
        <StatTile label="Average shirt" value={money(c.avgPrice)} />
        <StatTile label="Tracked shirts" value={c.count} />
        <StatTile label="Priced from real sales" value={`${c.fromTrades} of ${c.count}`} sub="the rest are estimates" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 32 }}>
        <SegmentTable title="By type" rows={byType} />
        <SegmentTable title="By league" rows={byLeague} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 16 }}>
        {[
          ['Biggest risers', sorted.slice(0, 5)],
          ['Biggest fallers', sorted.slice(-5).reverse()]
        ].map(([title, list]) => (
          <Card key={title as string}>
            <h3 className="title" style={{ margin: '0 0 12px' }}>
              {title as string}
            </h3>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8, fontSize: 13.5 }}>
              {(list as IndexInput[]).map((r) => (
                <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <Link to={'/shirt/' + r.id} style={{ color: 'var(--text)' }}>
                    {r.name}
                  </Link>
                  <span className="mono" style={{ color: tone(r.ch), whiteSpace: 'nowrap' }}>
                    {pct(r.ch)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <section aria-labelledby="all-title" style={{ marginTop: 40 }}>
        <SectionHeader
          id="all-title"
          size="sm"
          title="All tracked shirts"
          action={
            <Button size="sm" variant="ghost" onClick={download}>
              Download CSV
            </Button>
          }
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                <th style={{ fontWeight: 500, padding: '6px 0' }}>Shirt</th>
                <th style={{ fontWeight: 500 }}>Type</th>
                <th style={{ fontWeight: 500, textAlign: 'right' }}>Market price</th>
                <th style={{ fontWeight: 500, textAlign: 'right' }}>30 days</th>
                <th style={{ fontWeight: 500, textAlign: 'right' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '9px 12px 9px 0' }}>
                    <Link to={'/shirt/' + r.id} style={{ color: 'var(--text)' }}>
                      {r.name}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{r.type}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {money(r.price)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: tone(r.ch) }}>
                    {pct(r.ch)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 12.5 }}>{r.priceSource === 'trades' ? 'Sales' : 'Estimate'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="method-title" style={{ marginTop: 40, maxWidth: 720 }}>
        <h2 id="method-title" className="title">
          Methodology
        </h2>
        <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)' }}>
          <p>
            Each shirt’s market price is the average of its recent completed sales on Maillot. Where a shirt hasn’t sold yet, we use our catalogue estimate, based on
            comparable sales elsewhere — those rows are marked “Estimate”, and the share priced from real sales is shown above.
          </p>
          <p>
            The index change is value-weighted: a CHF 400 match-worn shirt moving 5% counts four times as much as a CHF 100 replica moving 5%. Segments use the same
            weighting within the segment.
          </p>
          <p style={{ marginBottom: 0 }}>
            Need the numbers in your own tools? The <Link to="/developers">Maillot data API</Link> serves the same index per shirt, with completed sales and the live order
            book.
          </p>
        </div>
        <ButtonLink to="/developers" size="sm" style={{ marginTop: 18 }}>
          Data API
        </ButtonLink>
      </section>
    </Page>
  );
}
