// Discover: the library's leagues as round picture tiles, the way big shops
// show their categories — one tap to every kit of that league, for
// inspiration.
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';

const CATEGORIES: { league: string; label?: string; img: string }[] = [
  { league: 'National Teams', label: 'home.cat.wc', img: '/library/wc/argentina/2022-home-kit.webp' },
  { league: 'Premier League', img: '/library/pl/liverpool/2025-26-home-kit.webp' },
  { league: 'La Liga', img: '/library/ll/real-madrid/2026-27-home-kit.webp' },
  { league: 'Bundesliga', img: '/library/bl/bayern/2026-27-home-kit.webp' },
  { league: 'Serie A', img: '/library/sa/milan/2006-07-home-kit.webp' },
  { league: 'Ligue 1', img: '/library/l1/psg/2025-26-home-kit.webp' },
  { league: 'Eredivisie', img: '/library/ed/ajax/1994-95-home-kit.webp' },
  { league: 'Primeira Liga', img: '/library/pt/benfica/2025-26-home-kit.webp' },
  { league: 'Süper Lig', img: '/library/tr/galatasaray/2025-26-home-kit.webp' },
  { league: 'Swiss Super League', label: 'home.cat.ssl', img: '/library/yb/2025-26-home-kit.webp' }
];

export function Categories() {
  const { t } = usePrefs();
  return (
    <section aria-labelledby="cat-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(20px,3vw,36px) var(--gutter) 0' }}>
      <h2 id="cat-title" className="title" style={{ margin: '0 0 14px' }}>
        {t('home.cat.title')}
      </h2>
      <ul style={{ listStyle: 'none', padding: '4px 2px 8px', margin: 0, display: 'flex', gap: 'clamp(12px,2vw,22px)', overflowX: 'auto', scrollSnapType: 'x proximity' }}>
        {CATEGORIES.map((c) => {
          const name = c.label ? t(c.label) : c.league;
          return (
            <li key={c.league} style={{ flex: 'none', scrollSnapAlign: 'start' }}>
              <Link to={'/library?league=' + encodeURIComponent(c.league)} style={{ display: 'grid', justifyItems: 'center', gap: 8, width: 'clamp(84px,10vw,112px)', color: 'var(--text)', textDecoration: 'none' }}>
                <span style={{ width: 'clamp(76px,9vw,104px)', aspectRatio: '1/1', borderRadius: '50%', background: 'var(--kit-tile)', border: '1px solid var(--kit-tile-line)', display: 'grid', placeItems: 'center', overflow: 'hidden', boxShadow: '0 8px 22px rgba(0,0,0,0.08)' }}>
                  <img src={c.img} alt="" loading="lazy" decoding="async" style={{ width: '74%', height: '74%', objectFit: 'contain' }} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 650, textAlign: 'center', lineHeight: 1.25 }}>{name}</span>
              </Link>
            </li>
          );
        })}
        <li style={{ flex: 'none', scrollSnapAlign: 'start' }}>
          <Link to="/library?league=other" style={{ display: 'grid', justifyItems: 'center', gap: 8, width: 'clamp(84px,10vw,112px)', color: 'var(--text)', textDecoration: 'none' }}>
            <span aria-hidden="true" style={{ width: 'clamp(76px,9vw,104px)', aspectRatio: '1/1', borderRadius: '50%', border: '1.5px dashed var(--line-strong)', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 300, color: 'var(--text-2)' }}>
              +
            </span>
            <span style={{ fontSize: 13, fontWeight: 650, textAlign: 'center', lineHeight: 1.25 }}>{t('home.cat.more')}</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
