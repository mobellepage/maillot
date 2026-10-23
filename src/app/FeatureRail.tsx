// A small tab on the right edge of every page, on phones too, with the
// "come back often" features — Fantasy, the kit library and the kit designer —
// so people find them from anywhere. Hidden in focused flows (adding a shirt,
// signing in, onboarding).
import { NavLink, useLocation } from 'react-router';
import { usePrefs } from '../lib/prefs.tsx';

const ITEMS = [
  { to: '/fantasy', emoji: '⚽', label: 'rail.fantasy' },
  { to: '/library', emoji: '📚', label: 'rail.library' },
  { to: '/designer', emoji: '🎨', label: 'rail.designer' }
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
