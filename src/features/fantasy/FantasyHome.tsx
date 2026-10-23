// The home of the game, as a view: the next deadline and what to do before
// it, the squad, the price moves, the way to leagues, standings and rules.
// Everything handed in, so it renders the same from live data and in
// previews. FantasyPage loads and wires it.
import { Link } from 'react-router';
import { FANTASY } from '../../config/fantasy.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import type { Matchday, MatchdayLineup, MyStanding, PriceMove, SquadClub, SquadState } from '../../utils/db.ts';
import { JerseyCard } from './JerseyCard.tsx';
import { deltaText, priceText, untilText } from './model.ts';

export interface FantasyHomeProps {
  matchday: Matchday | null;
  squad: SquadClub[];
  moves: PriceMove[];
  leagues: number | null;
  standing: MyStanding | null;
  now: number;
}

export function FantasyHome({ matchday: m, squad, moves, leagues, standing, now }: FantasyHomeProps) {
  const { t, lang } = usePrefs();
  const sq = (m?.squad as SquadState | null) ?? null;
  const l = (m?.lineup as MatchdayLineup | null) ?? null;
  const built = !!sq && sq.clubs.length === FANTASY.squadSize;
  const open = !!m && m.status === 'upcoming' && new Date(m.deadline).getTime() > now;
  const deadline = m ? new Date(m.deadline).toLocaleString(lang, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: FANTASY.timeZone }) : '';
  const starters = squad.filter((c) => c.starter);
  const captain = squad.find((c) => c.captain);

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
            <b>{standing?.season_points ?? 0}</b>
            <small>{t('fantasy.pointsLabel')}</small>
          </span>
          <span className="fantasy-stat">
            <b>{standing?.division_number ? t('fantasy.profile.division', { n: standing.division_number }) : '–'}</b>
            <small>{standing?.division_rank ? t('fantasy.st.myRank', { rank: standing.division_rank, n: standing.division_size ?? 0 }) : t('fantasy.st.noDivision')}</small>
          </span>
          <span className="fantasy-stat fantasy-stat--gold">
            <b>{built ? priceText(sq!.value + sq!.bank) : priceText(FANTASY.budget)}</b>
            <small>{built ? t('fantasy.sq.bank', { n: priceText(sq!.bank) }) : t('fantasy.sq.budget')}</small>
          </span>
        </div>
      </header>

      {/* The Gameweek: the deadline, and what to do before it */}
      <section className={'fantasy-gw' + (open ? ' is-open' : '')} aria-labelledby="gw-title">
        <div className="fantasy-gw__body">
          <p className="fantasy-gw__kicker">{m ? `${m.cup_name} · ${m.season_name}` : 'Fantasy'}</p>
          <h2 id="gw-title" className="fantasy-gw__title">
            {m ? (open ? t('fantasy.home.deadlineIn', { n: m.number, t: untilText(m.deadline, now) ?? '' }) : m.status === 'live' ? t('fantasy.home.live', { n: m.number }) : m.status === 'scored' ? t('fantasy.home.scored', { n: m.number, points: l?.points ?? 0 }) : t('fantasy.home.locked', { n: m.number })) : t('fantasy.md.fixturesNone')}
          </h2>
          <p className="fantasy-gw__sub">{open ? t('fantasy.home.deadlineAt', { date: deadline }) : m?.international ? t('fantasy.md.international') : ''}</p>
          <div className="fantasy-gw__actions">
            {!built ? (
              <Link to="/fantasy/squad" className="btn btn--primary btn--lg">
                {t('fantasy.sq.build')}
              </Link>
            ) : (
              <>
                <Link to="/fantasy/matchday" className="btn btn--primary">
                  {open ? (l && !l.carried ? t('fantasy.home.lineupSet') : t('fantasy.home.setLineup')) : t('fantasy.md.tab.points')}
                </Link>
                <Link to={open ? '/fantasy/squad' : '/fantasy/matchday?tab=pick'} className="btn btn--secondary">
                  {open ? t('fantasy.sq.transfers') : t('fantasy.md.tab.pick')}
                  {sq && sq.first_locked && <small style={{ marginLeft: 6, opacity: 0.8 }}>{t('fantasy.sq.freeShort', { n: sq.free_transfers })}</small>}
                </Link>
              </>
            )}
          </div>
          {built && open && (
            <p className="fantasy-gw__fine">
              {captain ? t('fantasy.home.captainIs', { club: captain.name }) : t('fantasy.home.noCaptain')}
              {l && l.hits > 0 && <> · {t('fantasy.sq.hits', { n: l.hits })}</>}
              {l?.chip && <> · {t('fantasy.md.chip.' + l.chip)}</>}
            </p>
          )}
        </div>
        <ul className="fantasy-gw__five" aria-label={t('fantasy.md.tab.lineup')}>
          {Array.from({ length: FANTASY.starters }, (_, i) => {
            const c = starters[i];
            return <li key={c?.club_id ?? i}>{c ? <JerseyCard j={c} small /> : <span className="fantasy-jersey is-small is-empty">?</span>}</li>;
          })}
        </ul>
      </section>

      {!built && (
        <section className="fantasy-intro" aria-labelledby="intro-title">
          <h2 id="intro-title" className="title" style={{ margin: 0 }}>
            {t('fantasy.intro.title')}
          </h2>
          <ol>
            <li>{t('fantasy.intro.1', { n: FANTASY.squadSize, budget: FANTASY.budget })}</li>
            <li>{t('fantasy.intro.2', { n: FANTASY.starters })}</li>
            <li>{t('fantasy.intro.3')}</li>
          </ol>
          <Link to="/fantasy/rules" className="btn btn--ghost btn--sm">
            {t('fantasy.rules.title')}
          </Link>
        </section>
      )}

      <div className="fantasy-links">
        <Link to="/fantasy/squad" className="fantasy-link fantasy-link--md">
          <span aria-hidden="true">👕</span>
          <b>{t('fantasy.sq.title')}</b>
          <small>{built ? t('fantasy.sq.valueBody', { value: priceText(sq!.value), bank: priceText(sq!.bank) }) : t('fantasy.sq.buildBody', { n: FANTASY.squadSize })}</small>
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
        <Link to="/fantasy/stats" className="fantasy-link">
          <span aria-hidden="true">📊</span>
          <b>{t('fantasy.stats.title')}</b>
          <small>{t('fantasy.stats.linkBody')}</small>
        </Link>
        <Link to="/fantasy/rules" className="fantasy-link">
          <span aria-hidden="true">📜</span>
          <b>{t('fantasy.rules.title')}</b>
          <small>{t('fantasy.home.rulesBody', { win: FANTASY.points.win, draw: FANTASY.points.draw })}</small>
        </Link>
      </div>

      {/* The squad */}
      {built && (
        <section className="card fantasy-panel" aria-labelledby="squad-title" style={{ marginTop: 18 }}>
          <div className="fantasy-panel__head">
            <h2 id="squad-title" className="title" style={{ margin: 0 }}>
              {t('fantasy.sq.mine')}
            </h2>
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {priceText(sq!.value)}
            </span>
          </div>
          <ul className="fantasy-squadgrid">
            {squad.map((c) => (
              <li key={c.club_id}>
                <JerseyCard j={c} dim={!c.starter} />
              </li>
            ))}
          </ul>
          <p className="fantasy-panel__fine">{t('fantasy.sq.ownedHint')}</p>
        </section>
      )}

      {/* Prices on the move */}
      {moves.length > 0 && (
        <section className="card fantasy-panel" aria-labelledby="moves-title" style={{ marginTop: 18 }}>
          <div className="fantasy-panel__head">
            <h2 id="moves-title" className="title" style={{ margin: 0 }}>
              {t('fantasy.sq.moves')}
            </h2>
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {t('fantasy.md.number', { n: moves[0]!.matchday })}
            </span>
          </div>
          <ul className="fantasy-moves">
            {moves.map((x) => (
              <li key={x.club_id}>
                {x.image_path && <img src={x.image_path} alt="" loading="lazy" />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{x.name}</b>
                  <small>{x.league}</small>
                </span>
                <span className={'mono ' + (Number(x.delta) > 0 ? 'is-up' : 'is-down')}>{deltaText(x.delta)}</span>
                <span className="mono" style={{ color: 'var(--muted)' }}>{priceText(x.price)}</span>
              </li>
            ))}
          </ul>
          <p className="fantasy-panel__fine">{t('fantasy.sq.movesBody')}</p>
        </section>
      )}
    </>
  );
}
