import { pct } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { indexSegments } from '../catalog/model.ts';

export function IndexTicker() {
  const { t } = usePrefs();
  return (
    <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--bg-deep)' }}>
      {/* Scrolls sideways on small screens, so it must be keyboard-focusable. */}
      <div role="region" aria-label={t('home.tickerLabel')} tabIndex={0} style={{ margin: '0 auto', maxWidth: 1360, overflowX: 'auto' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: '0 var(--gutter)', display: 'flex' }}>
          {indexSegments().map((x) => (
            <li key={x.label} className="mono" style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '16px 28px 16px 0', marginRight: 28, borderRight: '1px solid var(--line)', whiteSpace: 'nowrap', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>{t(x.label)}</span>
              <span style={{ fontWeight: 600 }}>{x.value.toLocaleString('de-CH')}</span>
              <span style={{ color: x.change >= 0 ? 'var(--accent)' : 'var(--neg)' }}>{pct(x.change)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
