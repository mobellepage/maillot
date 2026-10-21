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
import { AlertsList } from '../watchlist/AlertsList.tsx';
import { LikedKits } from '../watchlist/LikedKits.tsx';
import { useKitLikes } from '../watchlist/useKitLikes.ts';
import { OffersPanel } from './OffersPanel.tsx';
import { CollectionTab } from './CollectionTab.tsx';
import { badgeFor, highlightsFirst, itemLook, itemName, libraryPicture, mainPhoto, valueOf } from './model.ts';
import { useCollection } from './useCollection.ts';
import { VaultSummary } from './VaultSummary.tsx';
import { PayoutsCard } from './PayoutsCard.tsx';
import { SITE_URL, shareOrigin } from '../../config/site.ts';
import { mainColor, renderCard, shareCard } from './shareCard.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { PlanChip } from '../premium/PlanChip.tsx';
import { LIBRARY_PICTURE_FIRST } from '../../config/rules.ts';
import { FollowCounts } from '../collectors/FollowCounts.tsx';
import { HighlightsRow } from '../collectors/HighlightsRow.tsx';
import { useQuery } from '@tanstack/react-query';
import * as db from '../../utils/db.ts';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { LevelBadge, LevelCard } from '../levels/LevelBadge.tsx';
import { PointsCard } from '../levels/PointsCard.tsx';
import { FavoriteClub } from '../library/FavoriteClub.tsx';

type Tab = 'collection' | 'watchlist' | 'orders';
/** Sharing the collection (link and picture) is switched off for now. */
const SHARING = false;
const TITLES = { collection: 'vault.title.collection', watchlist: 'vault.title.watchlist', orders: 'vault.title.orders' } as const;

export default function VaultPage({ tab }: { tab: Tab }) {
  useCatalog(); // re-render when the live catalogue loads
  const { money, t, tp, locale } = usePrefs();
  usePageMeta(t(TITLES[tab]));
  const { user, profile } = useSession();
  const handle = profile?.handle ? '@' + profile.handle : null;
  const toast = useToast();
  const { items, loading, error, refetch } = useCollection();
  const watch = useWatchlist();
  const kitLikes = useKitLikes();
  const orders = useOrders(!!user);
  const watched = watch.ids.map((id) => getShirt(id)).filter((s) => !!s);
  const totalValue = items.reduce((a, c) => a + (valueOf(c) ?? 0), 0);
  const myStats = useQuery({ queryKey: ['collectorStats', (profile?.handle ?? '').toLowerCase(), user?.id], queryFn: () => db.loadCollectorStats(profile!.handle!), enabled: !!profile?.handle });
  // My highlights as circles, like on my public profile (the library picture first, as in my collection).
  const tops = highlightsFirst(items).filter((c) => c.highlightedAt);
  const topThumb = usePhotoUrls(tops.map(mainPhoto), true);
  const highlightCircles = tops.map((c) => {
    const own = topThumb(mainPhoto(c));
    const lib = LIBRARY_PICTURE_FIRST || !mainPhoto(c) ? libraryPicture(c, true) : undefined;
    return { id: c.id, to: '/vault/item/' + c.id, name: itemName(c), src: lib ?? own, cutout: !!lib };
  });

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
    const url = shareOrigin() + '/#/vault/' + encodeURIComponent(encodeShareData(payload));
    // Phones (and the app) get the system share sheet; desktops copy the link.
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      navigator.share({ title: t('vault.shareTitle', { owner: payload.owner }), url }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(url).then(
      () => toast(t('vault.linkCopied')),
      () => toast(url)
    );
  };

  // A picture for stories and chats: total value, count and the top three.
  const shareImage = async () => {
    const valued = items.map((c) => ({ c, v: valueOf(c) ?? 0 })).sort((a, b) => b.v - a.v);
    const total = valued.reduce((a, x) => a + x.v, 0);
    try {
      const blob = await renderCard({
        eyebrow: handle ? t('vault.cardOf', { handle }) : t('vault.cardMine'),
        total: money(total),
        count: tp('vault.cardCount', items.length),
        shirts: valued.slice(0, 3).map(({ c, v }) => ({ name: itemName(c), valueText: money(v), color: mainColor(itemLook(c).look.pat) })),
        footer: t('vault.cardFooter'),
        site: SITE_URL.replace(/^https?:\/\//, '')
      });
      const how = await shareCard(blob, t('vault.cardText'));
      if (how === 'downloaded') toast(t('vault.cardSaved'));
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast(t('vault.cardFailed'));
    }
  };

  // Guests can keep a watchlist too (stored in this browser).
  if (!user) {
    return (
      <Page>
        <h1 className="display display--lg">{t('vault.title.watchlist')}</h1>
        <p style={{ color: 'var(--muted)', marginTop: 10 }}>{t('vault.guestBody')}</p>
        <div style={{ marginTop: 24 }}>
          <LikedKits />
          {watched.length ? <ShirtGrid shirts={watched} /> : !kitLikes.kits.length && <EmptyState title={t('vault.nothingWatched')}>{t('vault.tapHeart')}</EmptyState>}
        </div>
      </Page>
    );
  }

  const expert = items.filter((c) => c.verification.level === 'expert').length;
  const since = user.created_at ? new Date(user.created_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) : '';
  const tabs: [Tab, string, number][] = [
    ['collection', t('vault.tab.collection'), items.length],
    ['watchlist', t('vault.title.watchlist'), watch.ids.length + kitLikes.kits.length],
    ['orders', t('vault.title.orders'), orders.data?.length ?? 0]
  ];
  const path: Record<Tab, string> = { collection: '/vault', watchlist: '/watchlist', orders: '/orders' };

  return (
    <Page>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <div aria-hidden="true" style={{ width: 88, height: 88, borderRadius: '50%', flex: 'none' }}>
          <Avatar avatar={profile?.avatar} name={profile?.handle || user.email || '?'} size={72} ring={false} style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 className="display" style={{ fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1 }}>
            {t('vault.title.collection')}
          </h1>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {!loading && <LevelBadge shirts={items.length} value={totalValue} />}
            {handle ?? <Link to="/welcome?step=username">{t('vault.chooseHandle')}</Link>}
            {since && ' · ' + t('vault.memberSince', { date: since })}
          </div>
          {myStats.data && (
            <div style={{ marginTop: 12 }}>
              <FollowCounts handle={profile!.handle!} shirts={items.length} followers={myStats.data.followers} following={myStats.data.following} />
            </div>
          )}
          {profile?.bio && <p style={{ margin: '10px 0 0', fontSize: 14.5, lineHeight: 1.5, whiteSpace: 'pre-line', maxWidth: 520 }}>{profile.bio}</p>}
          {profile?.handle && (
            <Link to="/account#profile" style={{ display: 'inline-block', fontSize: 13, marginTop: 6, marginRight: 12 }}>
              {profile.bio ? t('ig.editProfile') : t('ig.addBio')}
            </Link>
          )}
          <PlanChip style={{ marginTop: 10, marginRight: 8 }} />
          {expert > 0 && (
            <Badge tone="warn" style={{ marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: 12 }}>
              {t('vault.expertCount', { n: expert })}
            </Badge>
          )}
        </div>
        {SHARING && (
          <>
            <Button variant="ghost" onClick={share} disabled={!items.length}>
              {t('vault.share')}
            </Button>
            <Button variant="secondary" onClick={shareImage} disabled={!items.length}>
              {t('vault.shareImage')}
            </Button>
          </>
        )}
        {/* Selling has no menu entry of its own any more: it starts here (and on a shirt's page). */}
        <ButtonLink to="/sell" variant="secondary">
          {t('nav.sell')}
        </ButtonLink>
        <ButtonLink to="/vault/add">{t('vault.add')}</ButtonLink>
      </div>

      <div style={{ marginTop: 18 }}>
        <HighlightsRow items={highlightCircles} />
      </div>

      <nav aria-label={t('vault.sections')} style={{ display: 'flex', gap: 28, marginTop: 32, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {tabs.map(([k, label, n]) => (
          <NavLink key={k} to={path[k]} aria-current={tab === k ? 'page' : undefined} style={{ padding: '0 0 14px', fontSize: 16, fontWeight: 700, color: tab === k ? 'var(--text)' : 'var(--muted)', borderBottom: `2px solid ${tab === k ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, display: 'flex', gap: 8, alignItems: 'center' }}>
            {label}
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {n}
            </span>
          </NavLink>
        ))}
      </nav>

      {tab === 'collection' && (
        <>
          <OffersPanel />
          <CollectionTab items={items} loading={loading} error={error} onRetry={refetch} />
          {/* Under the shirts: the collector's level, then the favourite team's checklist. */}
          <div style={{ marginTop: 28 }}>{!loading && !error && <LevelCard shirts={items.length} value={totalValue} />}</div>
          <div style={{ marginTop: 16 }}>
            <FavoriteClub />
          </div>
          {/* Collector points: only ever shown here, to the collector themselves. */}
          {!loading && !error && <PointsCard />}
        </>
      )}
      {tab === 'watchlist' && (
        <div style={{ marginTop: 24 }}>
          <AlertsList />
          <LikedKits />
          {watched.length ? <ShirtGrid shirts={watched} /> : !kitLikes.kits.length && <EmptyState title={t('vault.watchEmpty')}>{t('vault.tapHeart')}</EmptyState>}
        </div>
      )}
      {tab === 'orders' && <OrdersTab />}

      {/* The shirts come first; what they're worth follows below. */}
      <div style={{ marginTop: 8 }}>
        <VaultSummary items={items} watching={watch.ids.length} />
        <PayoutsCard />
      </div>
    </Page>
  );
}
