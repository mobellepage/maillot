import { usePrefs } from '../lib/prefs.tsx';
import { useSession } from '../lib/session.tsx';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  match?: (pathname: string) => boolean;
}

export function useNavItems() {
  const { t } = usePrefs();
  const { adminFlag } = useSession();
  const items: NavItem[] = [
    { to: '/', label: t('nav.discover'), short: t('nav.discover'), match: (p) => p === '/' },
    { to: '/market', label: t('nav.marketplace'), short: t('nav.marketShort'), match: (p) => p.startsWith('/market') || p.startsWith('/shirt') },
    { to: '/sell', label: t('nav.sell'), short: t('nav.sell') },
    { to: '/vault', label: t('nav.collection'), short: t('nav.collectionShort'), match: (p) => p.startsWith('/vault') || p === '/watchlist' || p === '/orders' }
  ];
  if (adminFlag) items.push({ to: '/admin', label: t('nav.admin'), short: t('nav.admin') });
  return items;
}

