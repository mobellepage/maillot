// The home page for signed-in members: their cockpit, not a pitch. What
// the collection is worth and how it moved, today's puzzle, and where to
// go next; their wishlist follows below (HomePage).
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { pct } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { usePhotoUrls } from '../../lib/usePhotoUrls.ts';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { ButtonLink, ShirtGraphic } from '../../ui/index.ts';
import { useDailyStatus } from '../daily/useDailyStatus.ts';
import { LevelBadge } from '../levels/LevelBadge.tsx';
import { itemLook, itemName, mainPhoto, valueOf } from '../vault/model.ts';
import { weeklyMoves } from '../vault/moves.ts';
import { useCollection } from '../vault/useCollection.ts';

const card = { borderRadius: 24, padding: 'clamp(20px,2.4vw,28px)', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 } as const;
const kicker = { fontSize: 13, fontWeight: 650, color: 'var(--accent)' } as const;

export function MemberHome() {
  const { t } = usePrefs();
  const { profile } = useSession();
  const { items } = useCollection();
  const value = items.reduce((a, c) => a + (valueOf(c) ?? 0), 0);
  return (
    <section aria-labelledby="me-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(28px,4vw,48px) var(--gutter) 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 id="me-title" className="display" style={{ fontSize: 'clamp(28px,4vw,42px)', margin: 0 }}>
          {profile?.handle ? t('home.me.hello', { name: '@' + profile.handle }) : t('home.me.helloAnon')}
        </h1>
        <LevelBadge shirts={items.length} value={value} />
      </div>
      <div style={{ display: 'grid', gap: 14, marginTop: 20, gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))' }}>
        <CollectionCard />
        <DailyCard />
        <ExploreCard />
      </div>
    </section>
  );
}

function CollectionCard() {
  const { money, t } = usePrefs();
  const { items, loading } = useCollection();
  const now = items.reduce((a, c) => a + (valueOf(c) ?? 0), 0);
  // Same query as the collection page, so the two share one cache entry.
  const ids = [...new Set(items.map((c) => c.catalogId).filter((x): x is string => !!x))].sort();
  const history = useQuery({ queryKey: ['valueHistory', ids, 370], queryFn: () => db.loadValueHistory(ids, 370), enabled: ids.length > 0, staleTime: 30 * 60 * 1000 });
  const week = history.data ? weeklyMoves(items.map((c) => ({ id: c.id, catalogId: c.catalogId, name: itemName(c), value: valueOf(c) })), history.data) : null;
  const latest = [...items].slice(-4).reverse();
  const photoUrl = usePhotoUrls(latest.map(mainPhoto).filter((p) => !!p), true);

  if (!loading && !items.length)
    return (
      <div className="card" style={{ ...card, gridColumn: '1 / -1' }}>
        <span style={kicker}>{t('home.me.collection')}</span>
        <p style={{ margin: 0, fontSize: 'clamp(20px,2.4vw,26px)', fontWeight: 750, lineHeight: 1.2 }}>{t('home.me.emptyTitle')}</p>
        <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 15 }}>{t('home.me.emptyBody')}</p>
        <div style={{ marginTop: 8 }}>
          <ButtonLink to="/vault/add">{t('home.me.add')}</ButtonLink>
        </div>
      </div>
    );

  return (
    <div className="card" style={card}>
      <span style={kicker}>{t('home.me.collection')}</span>
      <div className="mono" style={{ fontSize: 'clamp(32px,3.6vw,44px)', fontWeight: 700, lineHeight: 1.1 }}>
        {money(now)}
      </div>
      <div style={{ fontSize: 14, color: 'var(--muted)' }}>
        {t('home.me.shirts', { n: items.length })}
        {week && Math.abs(week.change) >= 1 && (
          <span className="mono" style={{ marginLeft: 8, color: week.change >= 0 ? 'var(--accent)' : 'var(--neg)' }}>
            {t('vault.thisWeek', { amount: (week.change >= 0 ? '+' : '−') + money(Math.abs(week.change)), pct: pct(week.pct) })}
          </span>
        )}
      </div>
      {latest.length > 0 && (
        <ul aria-label={t('home.me.latest')} style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', gap: 8 }}>
          {latest.map((c) => {
            const { look, glow } = itemLook(c);
            const photo = mainPhoto(c);
            const src = photo ? photoUrl(photo) : undefined;
            return (
              <li key={c.id}>
                <Link to={'/vault/item/' + c.id} aria-label={itemName(c)} style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: 14, overflow: 'hidden', background: `radial-gradient(circle,${glow},transparent 70%),var(--sunken)` }}>
                  {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShirtGraphic {...look} flat style={{ width: '82%' }} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 8 }}>
        <ButtonLink to="/vault" size="sm" variant="secondary">
          {t('home.me.open')}
        </ButtonLink>
        <ButtonLink to="/vault/add" size="sm">
          {t('home.me.add')}
        </ButtonLink>
      </div>
    </div>
  );
}

function DailyCard() {
  const { t } = usePrefs();
  const d = useDailyStatus();
  return (
    <Link to="/daily" className="card play-card" style={{ ...card, color: 'var(--text)', textDecoration: 'none' }}>
      <span style={kicker}>
        🧩 {t('home.play.daily.kicker', { n: d.n })}
      </span>
      <span style={{ fontSize: 'clamp(20px,2.4vw,26px)', fontWeight: 750, lineHeight: 1.2 }}>
        {d.played ? (d.played.won ? t('home.me.dailyWon', { n: d.played.tries }) : t('home.me.dailyLost')) : t('home.me.dailyOpen')}
      </span>
      <span style={{ fontSize: 14.5, color: 'var(--text-2)' }}>{d.streak > 0 ? t('home.me.streak', { n: d.streak }) : t('home.me.dailyBody')}</span>
      <span style={{ marginTop: 'auto', paddingTop: 8, fontWeight: 650, color: 'var(--accent)' }}>{d.played ? t('home.me.dailySee') : t('home.me.dailyPlay')} ›</span>
    </Link>
  );
}

function ExploreCard() {
  const { t } = usePrefs();
  const links: [string, string, string][] = [
    ['/feed', '🔥', t('home.me.feed')],
    ['/market', '🛒', t('home.me.market')],
    ['/library', '📚', t('home.me.library')],
    ['/watchlist', '♥', t('home.me.wishlist')]
  ];
  return (
    <nav aria-labelledby="explore-title" className="card" style={card}>
      <span id="explore-title" style={kicker}>
        {t('home.me.explore')}
      </span>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
        {links.map(([to, icon, label]) => (
          <li key={to}>
            <Link to={to} className="row-btn" style={{ fontSize: 15.5, fontWeight: 600 }}>
              <span aria-hidden="true" style={{ width: 28, textAlign: 'center' }}>
                {icon}
              </span>
              <span style={{ flex: 1 }}>{label}</span>
              <span aria-hidden="true" style={{ color: 'var(--muted)' }}>
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
