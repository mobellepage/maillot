import { Link } from 'react-router';
import { MULT, pct, TODAY, type Shirt } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Badge, Button, Card, KeyValueList } from '../../../ui/index.ts';
import type { ShirtStats } from '../../../utils/db.ts';

export function InfoCards({ s, stats, watched, toggleWatch }: { s: Shirt; stats: ShirtStats | null | undefined; watched: boolean; toggleWatch: () => void }) {
  const { money } = usePrefs();
  const year = s.hist.slice(-365);
  const unique = s.type === 'Match-worn';
  const sizeMult = (z: string) => (unique ? 1 : MULT[z] ?? 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 16, marginTop: 16 }}>
      <Card>
        <h2 className="title" style={{ margin: '0 0 12px' }}>
          Details
        </h2>
        <KeyValueList
          rows={[
            ['Season', s.season],
            ['Brand', s.brand],
            ['League', <Link key="l" to={'/market?league=' + encodeURIComponent(s.league)}>{s.league}</Link>],
            ['Edition', s.edition],
            ['Player print', s.player || 'None'],
            ['Condition', s.cond],
            ['Catalogue no.', s.sku],
            ['Authentication', <span key="a" style={{ color: 'var(--accent)', fontWeight: 600 }}>✓ Checked in Zürich before it ships</span>]
          ]}
        />
      </Card>
      <Card>
        <h2 className="title" style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          Market
          <Badge title="Index data is simulated until real sales accumulate" style={{ fontSize: 9.5 }}>
            DEMO
          </Badge>
        </h2>
        <KeyValueList
          rows={[
            ['52-week high', money(Math.max(...year))],
            ['52-week low', money(Math.min(...year))],
            ['Avg. sale (30d)', money(s.hist.slice(-30).reduce((a, b) => a + b, 0) / 30)],
            ['Volatility', (Math.abs(s.ch) / 3 + 2.1).toFixed(1) + '%'],
            ['Completed sales on Maillot', stats ? Number(stats.completed_sales).toLocaleString('de-CH') : '—'],
            ['Price premium vs retail', s.type === 'New' ? pct(s.ch * 0.8) : 'Retro · n/a']
          ]}
        />
        <h3 style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 8px' }}>Recent sales</h3>
        <table className="mono" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, color: 'var(--text-2)' }}>
          <thead className="sr-only">
            <tr>
              <th>Date</th>
              <th>Size</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {s.sales.map((x, i) => (
              <tr key={i}>
                <td style={{ padding: '7px 0' }}>{new Date(TODAY - x.o * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td>{x.size}</td>
                <td style={{ textAlign: 'right', color: 'var(--text)' }}>{money(x.p * sizeMult(x.size))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h2 className="title" style={{ margin: '0 0 16px' }}>
          Community
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <div className="tile">
            <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
              {stats ? Number(stats.watchers).toLocaleString('de-CH') : '0'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>collectors watching</div>
          </div>
          <div className="tile">
            <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
              {stats ? Number(stats.live_listings) : 0}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>live listings, all sizes</div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
          {unique ? 'A single player-issue piece: only one exists, so the market here is one listing at a time. Watch it to hear the moment it comes up.' : 'Watch this shirt to get notified when a new listing or a better price appears in your size.'}
        </p>
        <Button variant="secondary" size="sm" onClick={toggleWatch} aria-pressed={watched} style={{ marginTop: 14 }}>
          {watched ? '✓ Watching' : 'Watch this shirt'}
        </Button>
      </Card>
    </div>
  );
}
