// A small tab on the right edge of every page with the three "come back
// every day" features — the daily puzzle, the try-on studio and the kit
// library — so people find them from anywhere. Hidden in focused flows
// (adding a shirt, signing in, onboarding).
import { NavLink, useLocation } from 'react-router';
import { usePrefs } from '../lib/prefs.tsx';

const ITEMS = [
  { to: '/daily', emoji: '🧩', label: 'rail.daily' },
  { to: '/try-on', emoji: '🪞', label: 'rail.tryon' },
  { to: '/library', emoji: '📚', label: 'rail.library' }
] as const;

const HIDDEN = ['/vault/add', '/signin', '/welcome', '/reset-password', '/return', '/admin'];

export function FeatureRail() {
  const { t } = usePrefs();
  const { pathname } = useLocation();
  if (HIDDEN.some((p) => pathname.startsWith(p))) return null;
  return (
    <nav aria-label={t('rail.label')} className="feature-rail">
      {ITEMS.map((it) => (
        <NavLink key={it.to} to={it.to} className="feature-rail__item" aria-label={t(it.label)} title={t(it.label)}>
          <span aria-hidden="true">{it.emoji}</span>
          <span className="feature-rail__label" aria-hidden="true">
            {t(it.label)}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
