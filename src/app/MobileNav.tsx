import { NavLink, useLocation } from 'react-router';
import { usePrefs } from '../lib/prefs.tsx';
import { useNavItems, type NavIcon } from './nav.ts';
import { BagIcon, CompassIcon, FeedIcon, PlayCardIcon, ShieldIcon, ShirtIcon, TagIcon } from '../ui/index.ts';

const ICONS: Record<NavIcon, typeof CompassIcon> = { discover: CompassIcon, collection: ShirtIcon, feed: FeedIcon, swipe: PlayCardIcon, market: BagIcon, sell: TagIcon, admin: ShieldIcon };

export default function MobileNav() {
  const items = useNavItems();
  const { t } = usePrefs();
  const { pathname } = useLocation();
  return (
    <nav
      aria-label={t('header.mainNav')}
      className="show-mobile"
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70, background: 'rgba(10,12,11,0.94)', backdropFilter: 'blur(18px)', borderTop: '1px solid rgba(255,255,255,0.08)', justifyContent: 'space-around', padding: '8px 6px calc(8px + env(safe-area-inset-bottom))' }}
    >
      {items.map((n) => {
        const on = n.match ? n.match(pathname) : pathname === n.to;
        const Icon = ICONS[n.icon];
        return (
          <NavLink
            key={n.to}
            to={n.to}
            aria-current={on ? 'page' : undefined}
            style={{ flex: 1, minHeight: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: on ? 'var(--text)' : 'var(--muted)', fontSize: 11, fontWeight: 600 }}
          >
            <Icon size={22} style={{ color: on ? 'var(--accent)' : 'currentColor' }} />
            {n.short}
          </NavLink>
        );
      })}
    </nav>
  );
}
