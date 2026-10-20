// Discover: browse kits by decade, from the 70s to today.
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { ERAS, eraNumber } from './model.ts';

export function Eras() {
  const { t } = usePrefs();
  return (
    <section aria-labelledby="era-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(32px,4vw,56px) var(--gutter) 0' }}>
      <h2 id="era-title" className="title" style={{ margin: '0 0 6px' }}>
        {t('home.era.title')}
      </h2>
      <p style={{ margin: '0 0 16px', color: 'var(--text-2)', fontSize: 14.5 }}>
        {t('home.era.body')} <Link to="/library/find">{t('find.entry')} ›</Link>
      </p>
      <ul className="era-grid">
        {ERAS.map((e) => (
          <li key={e.decade}>
            <Link to={'/era/' + e.decade} className="era-tile">
              <img src={e.img} alt="" loading="lazy" decoding="async" />
              <span>{t('era.label', { d: eraNumber(e.decade) })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
