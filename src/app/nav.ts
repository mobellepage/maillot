import { usePrefs } from '../lib/prefs.tsx';
import { useSession } from '../lib/session.tsx';

export type NavIcon = 'discover' | 'collection' | 'feed' | 'market' | 'sell' | 'admin';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: NavIcon;
  match?: (pathname: string) => boolean;
}

export function useNavItems() {
  const { t } = usePrefs();
  const { adminFlag } = useSession();
  const items: NavItem[] = [
    { to: '/', icon: 'discover', label: t('nav.discover'), short: t('nav.discover'), match: (p) => p === '/' },
    { to: '/vault', icon: 'collection', label: t('nav.collection'), short: t('nav.collectionShort'), match: (p) => p.startsWith('/vault') || p === '/watchlist' || p === '/orders' },
    { to: '/feed', icon: 'feed', label: t('nav.feed'), short: t('nav.feed') },
    { to: '/market', icon: 'market', label: t('nav.marketplace'), short: t('nav.marketShort'), match: (p) => p.startsWith('/market') || p.startsWith('/shirt') },
    { to: '/sell', icon: 'sell', label: t('nav.sell'), short: t('nav.sell') }
  ];
  if (adminFlag) items.push({ to: '/admin', icon: 'admin', label: t('nav.admin'), short: t('nav.admin') });
  return items;
}

