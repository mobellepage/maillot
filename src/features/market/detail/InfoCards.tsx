import { Link } from 'react-router';
import type { Shirt } from '../../../data.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { Button, Card, KeyValueList } from '../../../ui/index.ts';
import type { ShirtStats } from '../../../utils/db.ts';

export function InfoCards({ s, stats, watched, toggleWatch }: { s: Shirt; stats: ShirtStats | null | undefined; watched: boolean; toggleWatch: () => void }) {
  const { money, t, label, locale } = usePrefs();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 16, marginTop: 16 }}>
      <Card>
        <h2 className="title" style={{ margin: '0 0 12px' }}>
          {t('ic.details')}
        </h2>
        {/* The model only: version, print, condition and size belong to each exemplar. */}
        <KeyValueList
          rows={[
            [t('ic.club'), s.club],
            [t('ic.season'), s.season],
            [t('ic.kit'), t('lib.kind.' + (s.kit ?? 'Home').toLowerCase())],
            [t('ic.brand'), s.brand],
            [t('ic.league'), <Link key="l" to={'/market?league=' + encodeURIComponent(s.league)}>{label('league', s.league)}</Link>],
            [t('ic.catalogueNo'), s.sku],
            [t('ic.productCodes'), s.productCodes?.length ? s.productCodes.join(', ') : '—']
          ]}
        />
      </Card>
      {/* Real Maillot sales only (one source: s.trades). Simulated index data lives in the chart, marked DEMO. */}
      <Card>
        <h2 className="title" style={{ margin: '0 0 12px' }}>
          {t('ic.salesTitle')}
        </h2>
        {s.trades.count === 0 ? (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{t('ic.noSales')}</p>
            <KeyValueList
              rows={[
                [t('ic.completed'), '0'],
                [t('ic.avg30'), '—'],
                [t('ic.volatility'), '—']
              ]}
            />
          </>
        ) : (
          <KeyValueList
            rows={[
              [t('ic.completed'), s.trades.count.toLocaleString('de-CH')],
              [t('ic.lastSale'), s.trades.lastPrice !== null ? money(s.trades.lastPrice) + (s.trades.lastSoldAt ? ' · ' + new Date(s.trades.lastSoldAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '') : '—'],
              [t('ic.avgRecent'), s.trades.avgRecent !== null ? money(s.trades.avgRecent) : '—']
            ]}
          />
        )}
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
          {t('ic.watchBody')}
        </p>
        <Button variant="secondary" size="sm" onClick={toggleWatch} aria-pressed={watched} style={{ marginTop: 14 }}>
          {watched ? t('ic.watching2') : t('ic.watch')}
        </Button>
      </Card>
    </div>
  );
}
