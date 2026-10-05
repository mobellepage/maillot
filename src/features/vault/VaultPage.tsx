import { Link, NavLink } from 'react-router';
import { useCatalog } from '../catalog/useCatalog.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { encodeShareData } from '../../utils/share.ts';
import { Badge, Button, ButtonLink, EmptyState, Page } from '../../ui/index.ts';
import { ShirtGrid } from '../catalog/ShirtGrid.tsx';
import { getShirt } from '../catalog/model.ts';
import { OrdersTab } from '../orders/OrdersTab.tsx';
import { useOrders } from '../orders/useOrders.ts';
import { useWatchlist } from '../watchlist/useWatchlist.ts';
import { CollectionTab } from './CollectionTab.tsx';
import { badgeFor, itemLook, itemName, valueOf } from './model.ts';
import { useCollection } from './useCollection.ts';
import { VaultSummary } from './VaultSummary.tsx';
import { PayoutsCard } from './PayoutsCard.tsx';

type Tab = 'collection' | 'watchlist' | 'orders';
const TITLES = { collection: 'vault.title.collection', watchlist: 'vault.title.watchlist', orders: 'vault.title.orders' } as const;

export default function VaultPage({ tab }: { tab: Tab }) {
  useCatalog(); // re-render when the live catalogue loads
  const { money, t, locale } = usePrefs();
  usePageMeta(t(TITLES[tab]));
  const { user, profile } = useSession();
  const handle = profile?.handle ? '@' + profile.handle : null;
  const toast = useToast();
  const { items, loading, error, refetch } = useCollection();
  const watch = useWatchlist();
  const orders = useOrders(!!user);
  const watched = watch.ids.map((id) => getShirt(id)).filter((s) => !!s);

  const share = () => {
    const payload = {
      // Never the email address: the chosen username, or nothing.
      owner: handle ?? t('vault.aCollector'),
      handle: handle ?? '',
      totalFmt: money(items.reduce((a, c) => a + (valueOf(c) ?? 0), 0)),
      items: items.map((c) => {
        const b = badgeFor(c);
        const { look, glow } = itemLook(c);
        const v = valueOf(c);
        return { id: c.id, name: itemName(c), size: c.size, priceFmt: v !== null ? money(v) : '—', ...look, glowA: glow, isCustom: true, badgeLabel: t(b.label), badgeColor: b.color, badgeBg: 'rgba(255,255,255,0.08)' };
      })
    };
    const url = location.origin + '/#/vault/' + encodeURIComponent(encodeShareData(payload));
    navigator.clipboard?.writeText(url).then(
      () => toast(t('vault.linkCopied')),
      () => toast(url)
    );
  };

  // Guests can keep a watchlist too (stored in this browser).
  if (!user) {
    return (
      <Page>
        <h1 className="display display--lg">{t('vault.title.watchlist')}</h1>
        <p style={{ color: 'var(--muted)', marginTop: 10 }}>{t('vault.guestBody')}</p>
        <div style={{ marginTop: 24 }}>{watched.length ? <ShirtGrid shirts={watched} /> : <EmptyState title={t('vault.nothingWatched')}>{t('vault.tapHeart')}</EmptyState>}</div>
      </Page>
    );
  }

  const expert = items.filter((c) => c.verification.level === 'expert').length;
  const since = user.created_at ? new Date(user.created_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) : '';
  const tabs: [Tab, string, number][] = [
    ['collection', t('vault.tab.collection'), items.length],
    ['watchlist', t('vault.title.watchlist'), watch.ids.length],
    ['orders', t('vault.title.orders'), orders.data?.length ?? 0]
  ];
  const path: Record<Tab, string> = { collection: '/vault', watchlist: '/watchlist', orders: '/orders' };

  return (
    <Page>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <div aria-hidden="true" style={{ width: 88, height: 88, borderRadius: '50%', border: '3px solid var(--accent)', padding: 4, flex: 'none' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--avatar-grad)', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 800 }}>{(user.email || '?').slice(0, 2).toUpperCase()}</div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 className="display" style={{ fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1 }}>
            {t('vault.title.collection')}
          </h1>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
            {handle ?? <Link to="/welcome?step=username">{t('vault.chooseHandle')}</Link>}
            {since && ' · ' + t('vault.memberSince', { date: since })}
          </div>
          {expert > 0 && (
            <Badge tone="warn" style={{ marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: 12 }}>
              {t('vault.expertCount', { n: expert })}
            </Badge>
          )}
        </div>
        <Button variant="ghost" onClick={share} disabled={!items.length}>
          {t('vault.share')}
        </Button>
        <ButtonLink to="/vault/add">{t('vault.add')}</ButtonLink>
      </div>

      <VaultSummary items={items} watching={watch.ids.length} />
      <PayoutsCard />

      <nav aria-label={t('vault.sections')} style={{ display: 'flex', gap: 28, marginTop: 40, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {tabs.map(([k, label, n]) => (
          <NavLink key={k} to={path[k]} aria-current={tab === k ? 'page' : undefined} style={{ padding: '0 0 14px', fontSize: 16, fontWeight: 700, color: tab === k ? 'var(--text)' : 'var(--muted)', borderBottom: `2px solid ${tab === k ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, display: 'flex', gap: 8, alignItems: 'center' }}>
            {label}
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {n}
            </span>
          </NavLink>
        ))}
      </nav>

      {tab === 'collection' && <CollectionTab items={items} loading={loading} error={error} onRetry={refetch} />}
      {tab === 'watchlist' && <div style={{ marginTop: 24 }}>{watched.length ? <ShirtGrid shirts={watched} /> : <EmptyState title={t('vault.watchEmpty')}>{t('vault.tapHeart')}</EmptyState>}</div>}
      {tab === 'orders' && <OrdersTab />}
    </Page>
  );
}
