// The Feed's tabs: Following (members) and Fits (outfits from the Pinterest
// board, when one is set — config PINTEREST_BOARD). Swiping through shirts
// is a menu entry of its own (Swipe, /feed).
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { PINTEREST_BOARD } from '../../config/site.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';

const tab = ({ isActive }: { isActive: boolean }) => ({ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--muted)', textDecoration: 'none' });

export function FeedTabs({ children }: { children?: ReactNode }) {
  const { t } = usePrefs();
  const { user } = useSession();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--line)', maxWidth: 1360, margin: '0 auto' }}>
      <nav aria-label={t('feed.title')} style={{ display: 'flex', gap: 16 }}>
        {/* Members: the shirts of the collectors they follow, like Instagram's home. */}
        {user && (
          <NavLink to="/feed/following" style={tab}>
            {t('following.tab')}
          </NavLink>
        )}
        {PINTEREST_BOARD && (
          <NavLink to="/fits" style={tab}>
            {t('fits.tab')}
          </NavLink>
        )}
      </nav>
      {children}
    </div>
  );
}
