import { Link } from 'react-router';
import { MULT, pct, TODAY, type Shirt } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Badge, Button, Card, KeyValueList } from '../../../ui/index.ts';
import type { ShirtStats } from '../../../utils/db.ts';

export function InfoCards({ s, stats, watched, toggleWatch }: { s: Shirt; stats: ShirtStats | null | undefined; watched: boolean; toggleWatch: () => void }) {
  const { money, t, label, locale } = usePrefs();
  const year = s.hist.slice(-365);
  const unique = s.type === 'Match-worn';
  const sizeMult = (z: string) => (unique ? 1 : MULT[z] ?? 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 16, marginTop: 16 }}>
      <Card>
        <h2 className="title" style={{ margin: '0 0 12px' }}>
          {t('ic.details')}
        </h2>
        <KeyValueList
          rows={[
            [t('ic.season'), s.season],
            [t('ic.brand'), s.brand],
            [t('ic.league'), <Link key="l" to={'/market?league=' + encodeURIComponent(s.league)}>{label('league', s.league)}</Link>],
            [t('ic.edition'), label('edition', s.edition)],
            [t('ic.playerPrint'), s.player || t('ic.none')],
            [t('ic.condition'), label('cond', s.cond)],
            [t('ic.catalogueNo'), s.sku],
            [t('ic.authentication'), <span key="a" style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('ic.checked')}</span>]
          ]}
        />
      </Card>
      <Card>
        <h2 className="title" style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('ic.market')}
          <Badge title={t('ic.demoTitle')} style={{ fontSize: 9.5 }}>
            DEMO
          </Badge>
        </h2>
        <KeyValueList
          rows={[
            [t('ic.high52'), money(Math.max(...year))],
            [t('ic.low52'), money(Math.min(...year))],
            [t('ic.avg30'), money(s.hist.slice(-30).reduce((a, b) => a + b, 0) / 30)],
            [t('ic.volatility'), (Math.abs(s.ch) / 3 + 2.1).toFixed(1) + '%'],
            [t('ic.completed'), stats ? Number(stats.completed_sales).toLocaleString('de-CH') : '—'],
            [t('ic.premium'), s.type === 'New' ? pct(s.ch * 0.8) : t('ic.retroNA')]
          ]}
        />
        <h3 style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 8px' }}>{t('ic.recentSales')}</h3>
        <table className="mono" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, color: 'var(--text-2)' }}>
          <thead className="sr-only">
            <tr>
              <th>{t('ic.date')}</th>
              <th>{t('ic.sizeCol')}</th>
              <th>{t('ic.price')}</th>
            </tr>
          </thead>
          <tbody>
            {s.sales.map((x, i) => (
              <tr key={i}>
                <td style={{ padding: '7px 0' }}>{new Date(TODAY - x.o * 864e5).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</td>
                <td>{x.size}</td>
                <td style={{ textAlign: 'right', color: 'var(--text)' }}>{money(x.p * sizeMult(x.size))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h2 className="title" style={{ margin: '0 0 16px' }}>
          {t('ic.community')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <div className="tile">
            <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
              {stats ? Number(stats.watchers).toLocaleString('de-CH') : '0'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t('ic.watching')}</div>
          </div>
          <div className="tile">
            <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
              {stats ? Number(stats.live_listings) : 0}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t('ic.liveListings')}</div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
          {unique ? t('ic.uniqueBody') : t('ic.watchBody')}
        </p>
        <Button variant="secondary" size="sm" onClick={toggleWatch} aria-pressed={watched} style={{ marginTop: 14 }}>
          {watched ? t('ic.watching2') : t('ic.watch')}
        </Button>
      </Card>
    </div>
  );
}
