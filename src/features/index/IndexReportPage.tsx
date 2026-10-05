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
  const { money, t, label } = usePrefs();
  return (
    <Card>
      <h3 className="title" style={{ margin: '0 0 12px' }}>
        {title}
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
            <th style={{ fontWeight: 500, padding: '6px 0' }}>{t('idx.segment')}</th>
            <th style={{ fontWeight: 500, textAlign: 'right' }}>{t('idx.shirts')}</th>
            <th style={{ fontWeight: 500, textAlign: 'right' }}>{t('idx.avgPrice')}</th>
            <th style={{ fontWeight: 500, textAlign: 'right' }}>{t('idx.30d')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.name} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '8px 0' }}>{label(title === t('idx.byType') ? 'type' : 'league', s.name)}</td>
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
  const { money, t, label, locale } = usePrefs();
  const [today] = useState(() => new Date());
  usePageMeta(t('idx.meta'), t('idx.metaDesc'));
  const rows: IndexInput[] = shirts.map((s) => ({ id: s.id, name: s.name, league: s.league, type: s.type, price: s.price, ch: s.ch, priceSource: s.priceSource }));
  const c = composite(rows);
  const byType = segments(rows, 'type');
  const byLeague = segments(rows, 'league');
  const sorted = [...rows].sort((a, b) => b.ch - a.ch);
  const month = today.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `maillot-shirt-index-${today.toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Page>
      <SectionHeader level={1} size="lg" eyebrow={t('idx.eyebrow', { month })} title={t('idx.title')} />
      <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', margin: '-8px 0 0' }}>
        {t('idx.lede', { n: c.count })}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 28 }}>
        <StatTile highlight label={t('idx.change')} value={<span style={{ color: tone(c.change) }}>{pct(c.change)}</span>} sub={t('idx.weighted')} />
        <StatTile label={t('idx.avg')} value={money(c.avgPrice)} />
        <StatTile label={t('idx.tracked')} value={c.count} />
        <StatTile label={t('idx.fromSales')} value={t('idx.ofN', { a: c.fromTrades, b: c.count })} sub={t('idx.restEstimates')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 32 }}>
        <SegmentTable title={t('idx.byType')} rows={byType} />
        <SegmentTable title={t('idx.byLeague')} rows={byLeague} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 16 }}>
        {[
          [t('idx.risers'), sorted.slice(0, 5)],
          [t('idx.fallers'), sorted.slice(-5).reverse()]
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
          title={t('idx.all')}
          action={
            <Button size="sm" variant="ghost" onClick={download}>
              {t('idx.csv')}
            </Button>
          }
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                <th style={{ fontWeight: 500, padding: '6px 0' }}>{t('idx.shirt')}</th>
                <th style={{ fontWeight: 500 }}>{t('idx.type')}</th>
                <th style={{ fontWeight: 500, textAlign: 'right' }}>{t('idx.market')}</th>
                <th style={{ fontWeight: 500, textAlign: 'right' }}>{t('idx.30d')}</th>
                <th style={{ fontWeight: 500, textAlign: 'right' }}>{t('idx.source')}</th>
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
                  <td style={{ color: 'var(--text-2)' }}>{label('type', r.type)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {money(r.price)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: tone(r.ch) }}>
                    {pct(r.ch)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 12.5 }}>{r.priceSource === 'trades' ? t('idx.sales') : t('idx.estimate')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="method-title" style={{ marginTop: 40, maxWidth: 720 }}>
        <h2 id="method-title" className="title">
          {t('idx.method')}
        </h2>
        <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)' }}>
          <p>{t('idx.m1')}</p>
          <p>{t('idx.m2')}</p>
          <p style={{ marginBottom: 0 }}>{t('idx.m3')}</p>
        </div>
        <ButtonLink to="/developers" size="sm" style={{ marginTop: 18 }}>
          {t('idx.api')}
        </ButtonLink>
      </section>
    </Page>
  );
}
