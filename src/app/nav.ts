import { usePrefs } from '../lib/prefs.tsx';
import { useSession } from '../lib/session.tsx';

export type NavIcon = 'discover' | 'collection' | 'feed' | 'swipe' | 'market' | 'sell' | 'admin';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: NavIcon;
  match?: (pathname: string) => boolean;
}

export function useNavItems() {
  const { t } = usePrefs();
  const { adminFlag, user } = useSession();
  // Collection sits far right, under the thumb, where the profile usually is.
  const items: NavItem[] = [
    { to: '/', icon: 'discover', label: t('nav.discover'), short: t('nav.discover'), match: (p) => p === '/' },
    // Feed: what the collectors you follow add, and the outfits (Fits); visitors start with the Fits.
    { to: user ? '/feed/following' : '/fits', icon: 'feed', label: t('nav.feed'), short: t('nav.feed'), match: (p) => p.startsWith('/feed/') || p === '/fits' },
    // Swipe: the shirt cards (right = wishlist).
    { to: '/feed', icon: 'swipe', label: t('nav.swipe'), short: t('nav.swipe'), match: (p) => p === '/feed' },
    { to: '/market', icon: 'market', label: t('nav.marketplace'), short: t('nav.marketShort'), match: (p) => p.startsWith('/market') || p.startsWith('/shirt') },
    { to: '/vault', icon: 'collection', label: t('nav.collection'), short: t('nav.collectionShort'), match: (p) => p.startsWith('/vault') || p === '/watchlist' || p === '/orders' }
  ];
  if (adminFlag) items.push({ to: '/admin', icon: 'admin', label: t('nav.admin'), short: t('nav.admin') });
  return items;
}

