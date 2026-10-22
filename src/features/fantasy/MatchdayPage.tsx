// Matchday: line up five cards (one the captain) under the budget before
// the deadline, pick a chip and a score prediction; once locked, watch the
// cards score with their clubs' real results; afterwards the table.
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MATCHDAY, type Chip } from '../../config/fantasy.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { Fixture, LineupCard, Matchday, MatchdayLineup, SquadCard } from '../../utils/db.ts';
import { Button, ErrorState, Notice, Page, Segmented, Skeleton } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { GameCard } from './GameCard.tsx';
import { untilText } from './model.ts';
import { shareFantasy } from './fantasyShare.ts';
import { SITE_URL } from '../../config/site.ts';

type Tab = 'lineup' | 'fixtures' | 'table';

export default function MatchdayPage() {
  const { id } = useParams();
  const mdId = id ? Number(id) : undefined;
  const { t, lang } = usePrefs();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'lineup';
  const md = useQuery({ queryKey: ['fantasyMatchday', mdId ?? 'current', user?.id], queryFn: () => db.loadMatchday(mdId), staleTime: 15_000, retry: false });
  const m = md.data;
  usePageMeta((m ? t('fantasy.md.number', { n: m.number }) : t('fantasy.md.title')) + ' · Fantasy', t('fantasy.md.intro'));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);
  const fixtures = useQuery({ queryKey: ['fantasyFixtures', m?.id], queryFn: () => db.loadFixtures(m!.id), enabled: !!m, staleTime: 60_000, retry: false });

  const open = !!m && m.status === 'upcoming' && new Date(m.deadline).getTime() > now;
  const dateFmt = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <Page>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      {md.isLoading && <Skeleton height={300} radius={24} />}
      {md.isError && <ErrorState what={t('fantasy.md.title')} onRetry={() => md.refetch()} />}
      {md.data === null && <Notice>{t('fantasy.md.fixturesNone')}</Notice>}
      {m && (
        <>
          <header className="fantasy-head">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {m.cup_name} · {m.season_name}
              </p>
              <h1 className="display" style={{ margin: '4px 0 0', fontSize: 'clamp(28px,4vw,40px)' }}>
                {t('fantasy.md.number', { n: m.number })}
              </h1>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 14.5 }}>
                {dateFmt(m.window_start)} – {dateFmt(m.window_end)}
              </p>
            </div>
            <div className="fantasy-md__status" data-status={open ? 'open' : m.status}>
              {open ? t('fantasy.md.deadlineIn', { t: untilText(m.deadline, now) ?? '' }) : m.status === 'scored' ? t('fantasy.md.scored') : m.status === 'live' ? '● ' + t('fantasy.md.live') : t('fantasy.md.locked')}
              <small>{open ? t('fantasy.md.deadlineAt', { date: dateFmt(m.deadline) }) : t('fantasy.md.slots', { n: m.players, total: m.players }).replace(/^.*?(\d+).*$/, '')}</small>
            </div>
          </header>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
            {m.previous_id && (
              <Link to={'/fantasy/matchday/' + m.previous_id} className="btn btn--ghost btn--sm">
                ← {t('fantasy.md.prev')}
              </Link>
            )}
            {m.next_id && (
              <Link to={'/fantasy/matchday/' + m.next_id} className="btn btn--ghost btn--sm">
                {t('fantasy.md.next')} →
              </Link>
            )}
            <span style={{ flex: 1 }} />
            <Segmented label={t('fantasy.md.title')} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} options={[{ value: 'lineup', label: t('fantasy.md.tab.lineup') }, { value: 'fixtures', label: t('fantasy.md.tab.fixtures') }, { value: 'table', label: t('fantasy.md.tab.table') }]} />
          </div>
          <Notice style={{ marginTop: 14 }}>{m.international ? t('fantasy.md.international') : t('fantasy.md.clubsOnly')}</Notice>

          {tab === 'lineup' && (open ? <LineupEditor m={m} fixtures={fixtures.data ?? []} /> : <LineupView m={m} />)}
          {tab === 'fixtures' && <Fixtures rows={fixtures.data ?? []} loading={fixtures.isLoading} />}
          {tab === 'table' && <Table m={m} />}
        </>
      )}
    </Page>
  );
}

const CHIP_LABEL: Record<Chip, string> = { gold_rush: 'fantasy.md.chip.gold_rush', triple_captain: 'fantasy.md.chip.triple_captain', derby_day: 'fantasy.md.chip.derby_day', wildcard: 'fantasy.md.chip.wildcard' };

function LineupEditor({ m, fixtures }: { m: Matchday; fixtures: Fixture[] }) {
  const { t, money } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const cards = useQuery({ queryKey: ['fantasySquad', m.id, user?.id], queryFn: () => db.loadSquadCards(m.id), enabled: !!user, staleTime: 60_000, retry: false });
  const existing = (m.lineup as MatchdayLineup | null) ?? null;
  const [kits, setKits] = useState<string[]>(existing?.kits ?? []);
  const [captain, setCaptain] = useState<string | null>(existing?.captain ?? null);
  const [chip, setChip] = useState<Chip | null>((existing?.chip as Chip | null) ?? null);
  const [pred, setPred] = useState<{ home: string; away: string }>({ home: existing?.pred_home?.toString() ?? '', away: existing?.pred_away?.toString() ?? '' });
  const [filter, setFilter] = useState<'plays' | 'all' | 'gold'>('plays');
  const byId = useMemo(() => new Map((cards.data ?? []).map((c) => [c.kit_id, c])), [cards.data]);
  const chosen = kits.map((k) => byId.get(k)).filter((c): c is SquadCard => !!c);
  const used = chosen.reduce((a, c) => a + Number(c.value), 0);
  const over = chip !== 'wildcard' && used > Number(m.budget);
  const captainCard = captain ? byId.get(captain) : undefined;
  const capFixture = captainCard ? fixtures.find((f) => f.home_club_id === captainCard.club_id || f.away_club_id === captainCard.club_id) : undefined;
  const usedChips = new Set(m.chips_used ?? []);

  const toggle = (c: SquadCard) => {
    if (kits.includes(c.kit_id)) {
      setKits(kits.filter((k) => k !== c.kit_id));
      if (captain === c.kit_id) setCaptain(null);
    } else if (kits.length < MATCHDAY.lineupSize) {
      setKits([...kits, c.kit_id]);
      if (!captain) setCaptain(c.kit_id);
    }
  };
  const save = useMutation({
    mutationFn: () => db.saveLineup(m.id, kits, captain!, chip, capFixture && pred.home !== '' && pred.away !== '' ? { fixture: capFixture.id, home: Number(pred.home), away: Number(pred.away) } : null),
    onSuccess: () => {
      toast(t('fantasy.md.saved'));
      void qc.invalidateQueries({ queryKey: ['fantasyMatchday'] });
    },
    onError: (e) => {
      const code = (e as { code?: string }).code;
      toast(code === 'P0470' ? t('fantasy.md.err.deadline') : code === 'P0471' || code === 'P0472' ? t('fantasy.md.err.size', { n: MATCHDAY.lineupSize }) : code === 'P0474' ? t('fantasy.md.err.budget') : code === 'P0475' ? t('fantasy.md.err.chip') : t('fantasy.md.err.failed'));
    }
  });
  const list = (cards.data ?? []).filter((c) => (filter === 'all' ? true : filter === 'gold' ? c.gold : c.plays));

  if (!user)
    return (
      <div style={{ marginTop: 18 }}>
        <Link to="/signin" state={{ from: '/fantasy/matchday' }} className="btn btn--primary">
          {t('fantasy.signin')}
        </Link>
      </div>
    );
  if (cards.data && cards.data.length < MATCHDAY.lineupSize)
    return (
      <Notice style={{ marginTop: 18 }}>
        {t('fantasy.md.noCards')}{' '}
        <Link to="/fantasy">{t('fantasy.open')}</Link>
      </Notice>
    );
  return (
    <div className="fantasy-md">
      {/* The five */}
      <section className="card fantasy-md__squad" aria-label={t('fantasy.md.tab.lineup')}>
        <div className="fantasy-panel__head">
          <h2 className="title" style={{ margin: 0 }}>
            {t('fantasy.md.slots', { n: kits.length, total: MATCHDAY.lineupSize })}
          </h2>
          <span className="mono" style={{ fontSize: 12.5, color: over ? 'var(--neg)' : 'var(--muted)' }}>
            {t('fantasy.md.budgetUsed', { used: money(used), total: money(Number(m.budget)) })}
          </span>
        </div>
        <span className="fantasy-progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (used / Number(m.budget)) * 100)}%`, background: over ? 'var(--neg)' : undefined }} />
        </span>
        {over && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--neg)' }}>{t('fantasy.md.overBudget')}</p>}
        <ul className="fantasy-md__slots">
          {Array.from({ length: MATCHDAY.lineupSize }, (_, i) => {
            const c = chosen[i];
            return (
              <li key={i} className={'fantasy-md__slot' + (c ? '' : ' is-empty') + (c && captain === c.kit_id ? ' is-captain' : '')}>
                {c ? (
                  <>
                    <button type="button" className="fantasy-md__cardbtn" onClick={() => toggle(c)} aria-label={`${c.club_name} ${c.season}`}>
                      <GameCard c={c} />
                    </button>
                    <button type="button" className={'fantasy-md__cap' + (captain === c.kit_id ? ' is-on' : '')} aria-pressed={captain === c.kit_id} onClick={() => setCaptain(c.kit_id)} title={t('fantasy.md.makeCaptain')}>
                      C
                    </button>
                    <span className="fantasy-md__val">{money(Number(c.value))}</span>
                  </>
                ) : (
                  <span className="fantasy-md__empty">?</span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="fantasy-md__opts">
          <div>
            <p className="fantasy-md__label">{t('fantasy.md.chip')}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="option-btn" aria-pressed={chip === null} onClick={() => setChip(null)} style={{ padding: '6px 11px', fontSize: 12.5 }}>
                {t('fantasy.md.chip.none')}
              </button>
              {MATCHDAY.chips.map((c) => (
                <button key={c} type="button" className="option-btn" aria-pressed={chip === c} disabled={usedChips.has(c)} onClick={() => setChip(c)} title={t(CHIP_LABEL[c] + '.body')} style={{ padding: '6px 11px', fontSize: 12.5 }}>
                  {t(CHIP_LABEL[c])}
                  {usedChips.has(c) && <small style={{ marginLeft: 6, color: 'var(--muted)' }}>{t('fantasy.md.chipUsed')}</small>}
                </button>
              ))}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>{chip ? t(CHIP_LABEL[chip] + '.body') : t('fantasy.md.chipNote')}</p>
          </div>
          <div>
            <p className="fantasy-md__label">{t('fantasy.md.pred')}</p>
            {capFixture ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13.5 }}>
                <span style={{ minWidth: 0 }}>{capFixture.home_name}</span>
                <input inputMode="numeric" value={pred.home} onChange={(e) => setPred({ ...pred, home: e.target.value.replace(/\D/g, '').slice(0, 2) })} className="fantasy-md__goal" aria-label={capFixture.home_name} />
                <span>:</span>
                <input inputMode="numeric" value={pred.away} onChange={(e) => setPred({ ...pred, away: e.target.value.replace(/\D/g, '').slice(0, 2) })} className="fantasy-md__goal" aria-label={capFixture.away_name} />
                <span style={{ minWidth: 0 }}>{capFixture.away_name}</span>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{captain ? t('fantasy.md.predNone') : t('fantasy.md.pick')}</p>
            )}
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>{t('fantasy.md.predBody', { exact: MATCHDAY.prediction.exact, outcome: MATCHDAY.prediction.outcome })}</p>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => save.mutate()} disabled={kits.length !== MATCHDAY.lineupSize || !captain || over} busy={save.isPending}>
            {t('fantasy.md.save')}
          </Button>
        </div>
      </section>

      {/* The picker */}
      <section style={{ marginTop: 18 }} aria-label={t('fantasy.cards.title')}>
        <div role="group" className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {(['plays', 'all', 'gold'] as const).map((f) => (
            <button key={f} type="button" className="option-btn" aria-pressed={filter === f} onClick={() => setFilter(f)} style={{ padding: '7px 13px', fontSize: 13, flex: 'none' }}>
              {t('fantasy.md.filter.' + f)}
              <span className="mono" style={{ marginLeft: 6, fontSize: 11.5, color: 'var(--muted)' }}>
                {(cards.data ?? []).filter((c) => (f === 'all' ? true : f === 'gold' ? c.gold : c.plays)).length}
              </span>
            </button>
          ))}
        </div>
        {cards.isLoading && <Skeleton height={240} radius={20} style={{ marginTop: 14 }} />}
        <ul className="fantasy-cardgrid">
          {list.map((c) => {
            const on = kits.includes(c.kit_id);
            return (
              <li key={c.kit_id} className={'fantasy-md__pick' + (on ? ' is-on' : '') + (c.plays ? '' : ' is-idle')}>
                <button type="button" className="fantasy-md__cardbtn" onClick={() => toggle(c)} aria-pressed={on} aria-label={`${c.club_name} ${c.season} · ${money(Number(c.value))}`}>
                  <GameCard c={c} />
                </button>
                <span className="fantasy-md__meta">
                  <b>{money(Number(c.value))}</b>
                  <span className={c.plays ? 'is-plays' : ''}>{c.plays ? '● ' + t('fantasy.md.plays') : t('fantasy.md.noMatch')}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        <b>{t('fantasy.md.scoringTitle')}:</b> {t('fantasy.md.scoring', { win: MATCHDAY.points.win, draw: MATCHDAY.points.draw, goal: MATCHDAY.points.goal, cs: MATCHDAY.points.cleanSheet, gold: MATCHDAY.multipliers.gold, cap: MATCHDAY.multipliers.captain })}
      </p>
    </div>
  );
}

function LineupView({ m }: { m: Matchday }) {
  const { t } = usePrefs();
  const { user, profile } = useSession();
  const toast = useToast();
  const cards = useQuery({ queryKey: ['fantasyLineupCards', m.id, user?.id], queryFn: () => db.loadLineupCards(m.id), enabled: !!user, staleTime: 30_000, retry: false });
  const l = (m.lineup as MatchdayLineup | null) ?? null;
  if (!user)
    return (
      <div style={{ marginTop: 18 }}>
        <Link to="/signin" state={{ from: '/fantasy/matchday' }} className="btn btn--primary">
          {t('fantasy.signin')}
        </Link>
      </div>
    );
  if (!l) return <Notice style={{ marginTop: 18 }}>{t('fantasy.md.noLineup')}</Notice>;
  return (
    <div className="fantasy-md">
      <section className="card fantasy-md__squad">
        <div className="fantasy-panel__head">
          <h2 className="title" style={{ margin: 0 }}>
            {t('fantasy.md.myPoints')}: <span className="mono">{l.points}</span>
          </h2>
          {m.rank && <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('fantasy.md.rank', { rank: m.rank, n: m.players })}</span>}
        </div>
        {l.carried && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>{t('fantasy.md.carried')}</p>}
        {m.status === 'scored' && cards.data && (
          <div style={{ marginTop: 10 }}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                shareFantasy({ kicker: t('fantasy.md.number', { n: m.number }), title: t('fantasy.share.matchday', { n: m.number, points: l.points }), subtitle: m.rank ? t('fantasy.share.rank', { rank: m.rank, n: m.players }) : undefined, stat: String(l.points), cards: cards.data.map((c) => ({ src: c.image_path ?? undefined, tone: c.gold ? 'gold' : c.rarity, label: `${c.club_name} ${c.season} · ${c.total}` })), handle: profile?.handle ?? null, link: SITE_URL + '/fantasy/matchday/' + m.id }, t('fantasy.share.matchday', { n: m.number, points: l.points }))
                  .then((how) => how === 'downloaded' && toast(t('fantasy.share.saved')))
                  .catch(() => {})
              }
            >
              {t('fantasy.share.card')}
            </Button>
          </div>
        )}
        {l.chip && <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t('fantasy.md.chip')}: <b>{t(CHIP_LABEL[l.chip as Chip])}</b></p>}
        {cards.isLoading && <Skeleton height={200} radius={16} style={{ marginTop: 12 }} />}
        <ul className="fantasy-md__scores">
          {(cards.data ?? []).map((c) => (
            <ScoreRow key={c.kit_id} c={c} />
          ))}
          {l.pred_fixture && (
            <li className="fantasy-md__scorerow">
              <span style={{ flex: 1 }}>
                {t('fantasy.md.predPoints')} · {l.pred_home}:{l.pred_away}
              </span>
              <b className="mono">+{l.pred_points}</b>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function ScoreRow({ c }: { c: LineupCard }) {
  const { t } = usePrefs();
  const matches = ((c.detail as { matches?: { home: string; away: string; score: string; status: string }[] })?.matches ?? []);
  return (
    <li className={'fantasy-md__scorerow' + (c.captain ? ' is-captain' : '')}>
      <span className="fantasy-md__thumb">
        <GameCard c={c} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
        <b style={{ fontSize: 13.5 }}>
          {c.club_name} {c.season} {c.captain && <span className="fantasy-md__captag">C</span>} {c.gold && <span className="fantasy-md__goldtag">Gold</span>}
        </b>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {matches.length ? matches.map((x) => `${x.home} ${x.score} ${x.away}${x.status === 'live' ? ' · live' : ''}`).join(' · ') : t('fantasy.md.noMatch')}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          {t('fantasy.md.base', { n: c.base })} · {t('fantasy.md.multiplier', { m: Number(c.multiplier) })}
        </span>
      </span>
      <b className="mono" style={{ fontSize: 18 }}>
        {c.total}
      </b>
    </li>
  );
}

function Fixtures({ rows, loading }: { rows: Fixture[]; loading: boolean }) {
  const { t, lang } = usePrefs();
  if (loading) return <Skeleton height={240} radius={20} style={{ marginTop: 18 }} />;
  if (!rows.length) return <Notice style={{ marginTop: 18 }}>{t('fantasy.md.fixturesNone')}</Notice>;
  const groups = new Map<string, Fixture[]>();
  for (const f of rows) {
    const k = new Date(f.kickoff).toLocaleString(lang, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  return (
    <div style={{ marginTop: 18, display: 'grid', gap: 18 }}>
      {[...groups].map(([k, list]) => (
        <section key={k}>
          <h2 className="title" style={{ margin: '0 0 8px', fontSize: 15 }}>
            {k}
          </h2>
          <ul className="fantasy-fixtures">
            {list.map((f) => (
              <li key={f.id} className={'fantasy-fixture is-' + f.status}>
                <span className="fantasy-fixture__team">
                  {f.home_image && <img src={f.home_image} alt="" loading="lazy" />}
                  {f.home_name}
                </span>
                <span className="fantasy-fixture__score mono">{f.status === 'scheduled' ? '–' : `${f.home_goals ?? 0}:${f.away_goals ?? 0}`}</span>
                <span className="fantasy-fixture__team is-away">
                  {f.away_name}
                  {f.away_image && <img src={f.away_image} alt="" loading="lazy" />}
                </span>
                {f.status === 'live' && <span className="fantasy-fixture__live">LIVE</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Table({ m }: { m: Matchday }) {
  const { t } = usePrefs();
  const rows = useQuery({ queryKey: ['fantasyMdTable', m.id], queryFn: () => db.loadMatchdayTable(m.id), staleTime: 30_000, retry: false });
  if (rows.isLoading) return <Skeleton height={240} radius={20} style={{ marginTop: 18 }} />;
  if (!rows.data?.length) return <Notice style={{ marginTop: 18 }}>{t('fantasy.md.tableNone')}</Notice>;
  return (
    <ol className="fantasy-table">
      {rows.data.map((r, i) => (
        <li key={r.user_id} className={'fantasy-table__row' + (r.is_me ? ' is-me' : '') + (i === 0 && m.status === 'scored' ? ' is-top' : '')}>
          <span className="mono fantasy-table__rank">{i + 1}</span>
          <Avatar avatar={r.avatar} name={r.handle} size={28} ring={false} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <Link to={'/u/' + r.handle} style={{ fontWeight: 650 }}>
              @{r.handle}
            </Link>
            {i === 0 && m.status === 'scored' && <span className="fantasy-table__crown"> 👑 {t('fantasy.md.manager')}</span>}
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{r.captain_name && 'C: ' + r.captain_name}</span>
          </span>
          <b className="mono" style={{ fontSize: 16 }}>
            {r.points}
          </b>
        </li>
      ))}
    </ol>
  );
}
