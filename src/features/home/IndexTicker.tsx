import { Link } from 'react-router';
import { pct } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { indexSegments } from '../catalog/model.ts';

// Average estimated market value per group of catalogue shirts, and how it
// moved over 30 days. The first cell says what the numbers are; the (i)
// links to how they're worked out.
export function IndexTicker() {
  const { t, money } = usePrefs();
  return (
    <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--bg-deep)' }}>
      {/* Scrolls sideways on small screens, so it must be keyboard-focusable. */}
      {/* position: relative keeps the screen-reader labels inside the scroller —
          without it they'd stretch the page sideways on phones. */}
      <div role="region" aria-label={t('home.tickerLabel')} tabIndex={0} style={{ position: 'relative', margin: '0 auto', maxWidth: 1360, overflowX: 'auto' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: '0 var(--gutter)', display: 'flex', alignItems: 'center' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px 12px 0', marginRight: 24, borderRight: '1px solid var(--line)', whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 600 }}>
            {t('home.tickerHead')}
            <Link to="/price-index" title={t('home.tickerInfo')} aria-label={t('home.tickerInfo')} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--line-strong)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
              i
            </Link>
          </li>
          {indexSegments().map((x) => (
            <li key={x.label} className="mono" style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '16px 28px 16px 0', marginRight: 28, borderRight: '1px solid var(--line)', whiteSpace: 'nowrap', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>{t(x.label)}</span>
              <span style={{ fontWeight: 600 }}>
                <span className="sr-only">{t('home.tickerAvg')} </span>
                {money(x.value)}
              </span>
              <span style={{ color: x.change >= 0 ? 'var(--accent)' : 'var(--neg)' }}>
                <span className="sr-only">{t('home.tickerChange')} </span>
                {pct(x.change)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
