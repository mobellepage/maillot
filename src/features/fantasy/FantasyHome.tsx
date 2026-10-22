// The home of the game, as a view: the pack, missions, cards and Gold —
// everything handed in, so it renders the same from live data and in
// previews. FantasyPage loads and wires it.
import { Link } from 'react-router';
import { FANTASY, RARITIES } from '../../config/fantasy.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { FantasyCard, FantasyMission, FantasyState, GoldTodo, Matchday, MyStanding } from '../../utils/db.ts';
import { Button } from '../../ui/index.ts';
import { GameCard } from './GameCard.tsx';
import { RARITY_COLOR, untilText } from './model.ts';

export interface FantasyHomeProps {
  s: FantasyState;
  missions: FantasyMission[];
  cardsByRarity: Record<string, number>;
  goldCards: FantasyCard[];
  todo: GoldTodo[];
  /** How many albums there are (null while unknown). */
  albums: number | null;
  matchday: Matchday | null;
  leagues: number | null;
  standing: MyStanding | null;
  now: number;
  opening: boolean;
  converting: boolean;
  onOpen: (extra: boolean) => void;
  onConvert: () => void;
}

const MISSION_LINK: Record<string, string> = { play_daily: '/daily', wishlist_add: '/library', like_shirt: '/feed/following', follow_collector: '/', check_value: '/vault', view_library: '/library', visit_market: '/market' };

export function FantasyHome({ s, missions, cardsByRarity, goldCards, todo, albums, matchday, leagues, standing, now, opening, converting, onOpen, onConvert }: FantasyHomeProps) {
  const { t } = usePrefs();
  const next = untilText(s.next_pack_at, now);
  const done = missions.filter((m) => m.done).length;
  const digital = Object.values(cardsByRarity).reduce((a, n) => a + n, 0);
  // How far the next pack is along its 12 hours (full when a pack is waiting).
  const progress = s.next_pack_at ? Math.max(0, Math.min(1, 1 - (new Date(s.next_pack_at).getTime() - now) / (FANTASY.packIntervalHours * 3_600_000))) : 1;
  const extraLeft = Math.max(0, FANTASY.extraPacksPerDay - s.extra_packs);
  const canExtra = s.points >= FANTASY.extraPackCost && extraLeft > 0;

  return (
    <>
      <header className="fantasy-head">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>
            Maillot
          </p>
          <h1 className="display" style={{ margin: '4px 0 0', fontSize: 'clamp(32px,5vw,48px)' }}>
            Fantasy
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 15, maxWidth: 560 }}>{t('fantasy.tagline')}</p>
        </div>
        <div className="fantasy-stats">
          <span className="fantasy-stat">
            <b>{s.points.toLocaleString('de-CH')}</b>
            <small>{t('fantasy.pointsLabel')}</small>
          </span>
          <span className="fantasy-stat">
            <b>{s.streak} 🔥</b>
            <small>{t('fantasy.streakLabel')}</small>
          </span>
          <span className="fantasy-stat fantasy-stat--gold">
            <b>{s.gold}</b>
            <small>{t('fantasy.goldLabel')}</small>
          </span>
        </div>
      </header>

      {/* The pack */}
      <section className={'fantasy-pack' + (s.packs > 0 ? ' is-ready' : '')} aria-labelledby="pack-title">
        <div className="fantasy-pack__art" aria-hidden="true">
          <span className="fantasy-pack__card fantasy-pack__card--l" />
          <span className="fantasy-pack__card fantasy-pack__card--r" />
          <span className="fantasy-pack__card fantasy-pack__card--top">
            <span className="fantasy-pack__m">M</span>
            <span className="fantasy-pack__n">{FANTASY.cardsPerPack}</span>
          </span>
          {s.packs > 1 && <span className="fantasy-pack__stack">×{s.packs}</span>}
        </div>
        <div className="fantasy-pack__body">
          <p className="fantasy-pack__kicker">{t('fantasy.packs.kicker')}</p>
          <h2 id="pack-title" className="fantasy-pack__title">
            {s.packs > 0 ? t('fantasy.packs.ready', { n: s.packs }) : t('fantasy.packs.none')}
          </h2>
          <div className="fantasy-pack__clock" role="img" aria-label={s.packs >= FANTASY.packStack ? t('fantasy.packs.full') : next ? t('fantasy.packs.next', { t: next }) : ''}>
            <span className="fantasy-pack__bar">
              <span style={{ width: `${progress * 100}%` }} />
            </span>
            <span>{s.packs >= FANTASY.packStack ? t('fantasy.packs.full') : next ? t('fantasy.packs.next', { t: next }) : t('fantasy.packs.cards', { n: FANTASY.cardsPerPack })}</span>
          </div>
          <div className="fantasy-pack__actions">
            <Button size="lg" onClick={() => onOpen(false)} disabled={s.packs <= 0} busy={opening} busyLabel={t('fantasy.opening')}>
              {t('fantasy.open')}
            </Button>
            <button type="button" className="fantasy-pack__extra" onClick={() => onOpen(true)} disabled={!canExtra || opening} title={t('fantasy.extraLeft', { n: extraLeft })}>
              {t('fantasy.extra', { cost: FANTASY.extraPackCost })}
              <small>{t('fantasy.extraLeft', { n: extraLeft })}</small>
            </button>
          </div>
          <p className="fantasy-pack__fine">
            <Link to="/fantasy/odds">{t('fantasy.odds.link')}</Link> · {t('fantasy.noMoney')}
          </p>
        </div>
      </section>

      <div className="fantasy-links">
        <Link to="/fantasy/matchday" className="fantasy-link fantasy-link--md">
          <span aria-hidden="true">⚽</span>
          <b>{t('fantasy.home.matchday')}{matchday ? ' ' + matchday.number : ''}</b>
          <small>{matchday ? (matchday.status === 'live' ? t('fantasy.home.matchdayLive') : matchday.lineup ? t('fantasy.home.matchdaySet') : t('fantasy.home.matchdayBody', { t: untilText(matchday.deadline, now) ?? '' })) : ''}</small>
        </Link>
        <Link to="/fantasy/leagues" className="fantasy-link">
          <span aria-hidden="true">🏆</span>
          <b>{t('fantasy.home.leagues')}</b>
          <small>{leagues === null ? '' : leagues > 0 ? t('fantasy.home.leaguesBody', { n: leagues }) : t('fantasy.home.leaguesNone')}</small>
        </Link>
        <Link to="/fantasy/standings" className="fantasy-link">
          <span aria-hidden="true">📈</span>
          <b>{t('fantasy.home.standings')}</b>
          <small>{standing?.division_number && standing.division_rank ? t('fantasy.home.standingsBody', { n: standing.division_number, rank: standing.division_rank }) : t('fantasy.home.standingsNone')}</small>
        </Link>
        <Link to="/fantasy/albums" className="fantasy-link">
          <span aria-hidden="true">📒</span>
          <b>{t('fantasy.home.albums')}</b>
          <small>{albums === null ? '' : t('fantasy.home.albumsBody', { n: albums })}</small>
        </Link>
        <Link to="/fantasy/shop" className="fantasy-link">
          <span aria-hidden="true">🛍️</span>
          <b>{t('fantasy.home.shop')}</b>
          <small>{t('fantasy.home.shopBody')}</small>
        </Link>
        <Link to="/fantasy/cards" className="fantasy-link">
          <span aria-hidden="true">🃏</span>
          <b>{t('fantasy.cards.title')}</b>
          <small>{t('fantasy.cards.link', { n: digital + s.gold })}</small>
        </Link>
      </div>

      <div className="fantasy-grid">
        {/* Missions */}
        <section className="card fantasy-panel" aria-labelledby="missions-title">
          <div className="fantasy-panel__head">
            <h2 id="missions-title" className="title" style={{ margin: 0 }}>
              {t('fantasy.missions.title')}
            </h2>
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {done}/{missions.length}
            </span>
          </div>
          <span className="fantasy-progress" aria-hidden="true">
            <span style={{ width: `${missions.length ? (done / missions.length) * 100 : 0}%` }} />
          </span>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 8 }}>
            {missions.map((m) => (
              <li key={m.key} className={'fantasy-mission' + (m.done ? ' is-done' : '')}>
                <span className="fantasy-mission__check" aria-hidden="true">
                  {m.done ? '✓' : ''}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{MISSION_LINK[m.key] && !m.done ? <Link to={MISSION_LINK[m.key]!}>{t('fantasy.m.' + m.key)}</Link> : t('fantasy.m.' + m.key)}</span>
                <span className="mono fantasy-mission__pts">+{m.points}</span>
              </li>
            ))}
          </ul>
          <p className="fantasy-panel__fine">{done === missions.length && missions.length ? t('fantasy.missions.allDone', { n: FANTASY.allMissionsBonus }) : t('fantasy.missions.bonus', { n: FANTASY.allMissionsBonus })}</p>
        </section>

        {/* Cards */}
        <section className="card fantasy-panel" aria-labelledby="cards-title">
          <div className="fantasy-panel__head">
            <h2 id="cards-title" className="title" style={{ margin: 0 }}>
              {t('fantasy.cards.title')}
            </h2>
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {digital + s.gold}
            </span>
          </div>
          <ul className="fantasy-rarities" aria-label={t('fantasy.cards.byRarity')}>
            <li style={{ '--rc': '#f3c53d' } as React.CSSProperties}>
              <b>{s.gold}</b> {t('fantasy.gold.badge')}
            </li>
            {RARITIES.map((r) => (
              <li key={r} style={{ '--rc': RARITY_COLOR[r] } as React.CSSProperties}>
                <b>{cardsByRarity[r] ?? 0}</b> {t('fantasy.rarity.' + r)}
              </li>
            ))}
          </ul>
          {digital === 0 ? (
            <p className="fantasy-panel__fine">{t('fantasy.cards.empty')}</p>
          ) : (
            s.duplicates > 0 && (
              <div className="fantasy-dup">
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>{t('fantasy.dup.body', { n: s.duplicates, points: s.dup_points })}</span>
                <Button size="sm" variant="secondary" onClick={onConvert} busy={converting}>
                  {t('fantasy.dup.convert')}
                </Button>
              </div>
            )
          )}
          <div style={{ marginTop: 'auto', paddingTop: 14 }}>
            <Link to="/fantasy/cards" className="btn btn--secondary btn--sm">
              {t('fantasy.cards.link', { n: digital + s.gold })}
            </Link>
          </div>
        </section>
      </div>

      {/* Gold: the real shirts */}
      <section className="card fantasy-panel fantasy-gold" aria-labelledby="gold-title">
        <div className="fantasy-gold__intro">
          <div className="fantasy-panel__head">
            <h2 id="gold-title" className="title" style={{ margin: 0 }}>
              ✨ {t('fantasy.gold.title')}
            </h2>
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {s.gold}
            </span>
          </div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>{t('fantasy.gold.body')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <Link to="/vault/add/library" className="btn btn--primary btn--sm">
              {t('fantasy.gold.add')}
            </Link>
            {s.gold > 0 && (
              <Link to="/fantasy/cards?f=gold" className="btn btn--secondary btn--sm">
                {t('fantasy.cards.goldAll', { n: s.gold })}
              </Link>
            )}
          </div>
        </div>
        {goldCards.length > 0 && (
          <ul className="fantasy-cardrow no-scrollbar" aria-label={t('fantasy.goldLabel')}>
            {goldCards.slice(0, 8).map((c) => (
              <li key={c.kit_id}>
                <GameCard c={c} />
              </li>
            ))}
          </ul>
        )}
        {todo.length > 0 && (
          <div className="fantasy-todo">
            <p className="fantasy-todo__title">{t('fantasy.gold.todoTitle', { n: todo.length })}</p>
            <ul>
              {todo.slice(0, 6).map((x) => (
                <li key={x.item_id}>
                  <Link to={'/vault/' + encodeURIComponent(x.item_id)}>{x.name ?? '?'}</Link>
                  <span>{x.needs === 'kit' ? t('fantasy.gold.needKit') : t('fantasy.gold.needPhoto')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
