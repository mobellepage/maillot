// Fantasy, the home of the game: your pack (open it, or when the next one
// comes), Kit Points and streak, today's missions, your cards at a glance
// and how to make Gold out of your real shirts. Visitors see what it is and
// a way in.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { FANTASY, RARITIES } from '../../config/fantasy.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { PackCard } from '../../utils/db.ts';
import { Button, ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { GameCard } from './GameCard.tsx';
import { PackReveal } from './PackReveal.tsx';
import { RARITY_COLOR, untilText } from './model.ts';
import { useFantasy } from './useFantasy.ts';

export default function FantasyPage() {
  const { t } = usePrefs();
  usePageMeta(t('fantasy.meta'), t('fantasy.metaDesc'));
  const { user, state, missions, cardsByRarity, open, convert } = useFantasy();
  const toast = useToast();
  const [pack, setPack] = useState<PackCard[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const openPack = async (extra: boolean) => {
    try {
      const cards = await open.mutateAsync(extra);
      setPack(cards);
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast(code === 'P0461' ? t('fantasy.err.points') : code === 'P0460' ? t('fantasy.err.limit') : code === 'P0462' ? t('fantasy.err.noPack') : t('fantasy.err.failed'));
    }
  };

  if (!user) return <Teaser />;
  const s = state.data;
  const next = untilText(s?.next_pack_at, now);
  const done = missions.filter((m) => m.done).length;
  const digital = Object.values(cardsByRarity).reduce((a, n) => a + n, 0);

  return (
    <Page>
      <header className="fantasy-head">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>
            🃏 Maillot
          </p>
          <h1 className="display" style={{ margin: '4px 0 0', fontSize: 'clamp(32px,5vw,48px)' }}>
            Fantasy
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 15, maxWidth: 560 }}>{t('fantasy.tagline')}</p>
        </div>
        <div className="fantasy-stats" aria-label={t('fantasy.pointsLabel')}>
          <span className="fantasy-stat">
            <b>{(s?.points ?? 0).toLocaleString('de-CH')}</b>
            <small>{t('fantasy.pointsLabel')}</small>
          </span>
          <span className="fantasy-stat">
            <b>{s?.streak ?? 0}🔥</b>
            <small>{t('fantasy.streakLabel')}</small>
          </span>
          <span className="fantasy-stat">
            <b>{s?.gold ?? 0}</b>
            <small>{t('fantasy.goldLabel')}</small>
          </span>
        </div>
      </header>

      {state.isLoading && <Skeleton height={220} radius={24} style={{ marginTop: 20 }} />}
      {state.isError && <ErrorState what="Fantasy" onRetry={() => state.refetch()} />}

      {s && (
        <div className="fantasy-grid">
          {/* The pack */}
          <section className={'fantasy-pack' + (s.packs > 0 ? ' is-ready' : '')} aria-labelledby="pack-title">
            <div className="fantasy-pack__art" aria-hidden="true">
              <span className="fantasy-pack__box">
                <span>M</span>
              </span>
              {s.packs > 1 && <span className="fantasy-pack__stack">×{s.packs}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="pack-title" className="title" style={{ margin: 0 }}>
                {s.packs > 0 ? t('fantasy.packs.ready', { n: s.packs }) : t('fantasy.packs.none')}
              </h2>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 14 }}>
                {s.packs >= FANTASY.packStack ? t('fantasy.packs.full') : next ? t('fantasy.packs.next', { t: next }) : ''} · {t('fantasy.packs.cards', { n: FANTASY.cardsPerPack })}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <Button onClick={() => openPack(false)} disabled={s.packs <= 0} busy={open.isPending && !open.variables} busyLabel={t('fantasy.opening')}>
                  {t('fantasy.open')}
                </Button>
                <Button variant="secondary" onClick={() => openPack(true)} disabled={s.points < FANTASY.extraPackCost || s.extra_packs >= FANTASY.extraPacksPerDay} busy={open.isPending && !!open.variables} busyLabel={t('fantasy.opening')} title={t('fantasy.extraLeft', { n: Math.max(0, FANTASY.extraPacksPerDay - s.extra_packs) })}>
                  {t('fantasy.extra', { cost: FANTASY.extraPackCost })}
                </Button>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                <Link to="/fantasy/odds">{t('fantasy.odds.link')}</Link> · {t('fantasy.noMoney')}
              </p>
            </div>
          </section>

          {/* Missions */}
          <section className="card fantasy-missions" aria-labelledby="missions-title">
            <h2 id="missions-title" className="title" style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              {t('fantasy.missions.title')}
              <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {done}/{missions.length}
              </span>
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 8 }}>
              {missions.map((m) => (
                <li key={m.key} className={'fantasy-mission' + (m.done ? ' is-done' : '')}>
                  <span className="fantasy-mission__check" aria-hidden="true">
                    {m.done ? '✓' : ''}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>{missionLink(m.key, t('fantasy.m.' + m.key))}</span>
                  <span className="mono" style={{ fontSize: 12.5, color: m.done ? 'var(--accent)' : 'var(--muted)' }}>
                    +{m.points}
                  </span>
                </li>
              ))}
            </ul>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>{done === missions.length && missions.length ? t('fantasy.missions.allDone', { n: FANTASY.allMissionsBonus }) : t('fantasy.missions.bonus', { n: FANTASY.allMissionsBonus })}</p>
          </section>

          {/* Cards */}
          <section className="card fantasy-album" aria-labelledby="cards-title">
            <h2 id="cards-title" className="title" style={{ margin: 0 }}>
              {t('fantasy.cards.title')}
            </h2>
            <ul className="fantasy-rarities" aria-label={t('fantasy.cards.byRarity')}>
              <li style={{ '--rc': '#f3c53d' } as React.CSSProperties}>
                <b>{s.gold}</b> <span>{t('fantasy.gold.badge')}</span>
              </li>
              {RARITIES.map((r) => (
                <li key={r} style={{ '--rc': RARITY_COLOR[r] } as React.CSSProperties}>
                  <b>{cardsByRarity[r] ?? 0}</b> <span>{t('fantasy.rarity.' + r)}</span>
                </li>
              ))}
            </ul>
            {s.duplicates > 0 && (
              <div className="fantasy-dup">
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>{t('fantasy.dup.body', { n: s.duplicates, points: s.dup_points })}</span>
                <Button size="sm" variant="secondary" onClick={() => convert.mutateAsync(undefined).then((p) => toast(t('fantasy.dup.converted', { points: p })))} busy={convert.isPending}>
                  {t('fantasy.dup.convert')}
                </Button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <Link to="/fantasy/cards" className="btn btn--secondary btn--sm">
                {t('fantasy.cards.link', { n: digital + s.gold })}
              </Link>
            </div>
          </section>

          <GoldSection gold={s.gold} />
        </div>
      )}

      {pack && <PackReveal cards={pack} onConvert={() => convert.mutateAsync(undefined).then((p) => toast(t('fantasy.dup.converted', { points: p })))} onClose={() => setPack(null)} />}
    </Page>
  );
}

/** A mission's text, linking to where it's done. */
function missionLink(key: string, text: string) {
  const to: Record<string, string> = { play_daily: '/daily', wishlist_add: '/library', like_shirt: '/feed/following', follow_collector: '/', check_value: '/vault', view_library: '/library', visit_market: '/market' };
  return to[key] ? <Link to={to[key]!}>{text}</Link> : text;
}

/** Gold: the member's real shirts in the game — and which ones aren't yet, and why. */
function GoldSection({ gold }: { gold: number }) {
  const { t } = usePrefs();
  const todo = useQuery({ queryKey: ['fantasyGoldTodo'], queryFn: db.loadGoldTodo, staleTime: 60_000, retry: false });
  const cards = useQuery({ queryKey: ['fantasyCards'], queryFn: db.loadFantasyCards, staleTime: 60_000, retry: false, enabled: gold > 0 });
  const goldCards = (cards.data ?? []).filter((c) => c.gold).slice(0, 4);
  return (
    <section className="card fantasy-gold" aria-labelledby="gold-title">
      <h2 id="gold-title" className="title" style={{ margin: 0 }}>
        ✨ {t('fantasy.gold.title')}
      </h2>
      <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>{t('fantasy.gold.body')}</p>
      {goldCards.length > 0 && (
        <ul className="fantasy-cardrow" aria-label={t('fantasy.goldLabel')}>
          {goldCards.map((c) => (
            <li key={c.kit_id}>
              <GameCard c={c} />
            </li>
          ))}
        </ul>
      )}
      {todo.data && todo.data.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 6 }}>
          {todo.data.slice(0, 4).map((x) => (
            <li key={x.item_id} style={{ fontSize: 13.5, display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span aria-hidden="true">○</span>
              <Link to={'/vault/' + encodeURIComponent(x.item_id)} style={{ minWidth: 0 }}>
                {x.needs === 'kit' ? t('fantasy.gold.todoKit', { name: x.name ?? '?' }) : t('fantasy.gold.todoPhoto', { name: x.name ?? '?' })}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 14 }}>
        <Link to="/vault/add/library" className="btn btn--primary btn--sm">
          {t('fantasy.gold.add')}
        </Link>
      </div>
    </section>
  );
}

/** For visitors: what the game is, and the way in. */
function Teaser() {
  const { t } = usePrefs();
  return (
    <Page narrow>
      <p className="eyebrow">🃏 Maillot</p>
      <h1 className="display display--lg">Fantasy</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 16, lineHeight: 1.55, marginTop: 10 }}>{t('fantasy.tagline')}</p>
      <ol style={{ margin: '18px 0 0', paddingLeft: 20, display: 'grid', gap: 8, fontSize: 15, lineHeight: 1.5 }}>
        <li>{t('fantasy.how.1', { n: FANTASY.cardsPerPack, h: FANTASY.packIntervalHours })}</li>
        <li>{t('fantasy.how.2')}</li>
        <li>{t('fantasy.how.3')}</li>
        <li>{t('fantasy.how.4')}</li>
      </ol>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
        <Link to="/signin" state={{ from: '/fantasy' }} className="btn btn--primary">
          {t('fantasy.signin')}
        </Link>
        <Link to="/fantasy/odds" className="btn btn--secondary">
          {t('fantasy.odds.link')}
        </Link>
      </div>
      <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>{t('fantasy.noMoney')}</p>
    </Page>
  );
}
