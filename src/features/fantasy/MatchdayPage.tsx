// The Gameweek: before Friday 18:00, pick five of the squad's eight to play
// (one the captain — a club whose shirt you own) and Bench Boost if you
// like. Once it has started: the points as they come in, "Pick team" for
// the next Gameweek (and transfers), the fixtures and the table. Next
// week's line-up opens only once this week has kicked off.
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FANTASY, type Chip } from '../../config/fantasy.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { Fixture, LineupClub, Matchday, MatchdayLineup, SquadClub, SquadState } from '../../utils/db.ts';
import { Button, Dialog, ErrorState, Notice, Page, Segmented, Skeleton } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { Pitch } from './Pitch.tsx';
import { priceText, untilText } from './model.ts';
import { errorText } from './errors.ts';
import { shareFantasy } from './fantasyShare.ts';
import { SITE_URL } from '../../config/site.ts';

type Tab = 'lineup' | 'points' | 'pick' | 'fixtures' | 'table';

export default function MatchdayPage() {
  const { id } = useParams();
  const mdId = id ? Number(id) : undefined;
  const { t, lang } = usePrefs();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const md = useQuery({ queryKey: ['fantasyMatchday', mdId ?? 'current', user?.id], queryFn: () => db.loadMatchday(mdId), staleTime: 15_000, retry: false });
  const m = md.data;
  // The Gameweek after this one — where the five are picked once this one has started.
  const current = useQuery({ queryKey: ['fantasyMatchday', 'current', user?.id], queryFn: () => db.loadMatchday(), enabled: !!mdId, staleTime: 15_000, retry: false });
  const isCurrent = !mdId || (current.data?.id ?? m?.id) === m?.id;
  const nextId = isCurrent && m && m.status !== 'upcoming' ? m.next_id : null;
  const next = useQuery({ queryKey: ['fantasyMatchday', nextId ?? 'none', user?.id], queryFn: () => db.loadMatchday(nextId!), enabled: !!nextId, staleTime: 15_000, retry: false });
  usePageMeta((m ? t('fantasy.md.number', { n: m.number }) : t('fantasy.md.title')) + ' · Fantasy', t('fantasy.md.intro'));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);
  const fixtures = useQuery({ queryKey: ['fantasyFixtures', m?.id], queryFn: () => db.loadFixtures(m!.id), enabled: !!m, staleTime: 60_000, retry: false });

  const open = !!m && m.status === 'upcoming' && new Date(m.deadline).getTime() > now;
  const tabs: { value: Tab; label: string }[] = open
    ? [{ value: 'lineup', label: t('fantasy.md.tab.lineup') }, { value: 'fixtures', label: t('fantasy.md.tab.fixtures') }]
    : [{ value: 'points', label: t('fantasy.md.tab.points') }, ...(nextId ? [{ value: 'pick' as Tab, label: t('fantasy.md.tab.pick') }] : []), { value: 'fixtures', label: t('fantasy.md.tab.fixtures') }, { value: 'table', label: t('fantasy.md.tab.table') }];
  const wanted = params.get('tab') as Tab | null;
  const tab: Tab = wanted && tabs.some((x) => x.value === wanted) ? wanted : tabs[0]!.value;
  const dateFmt = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: FANTASY.timeZone });
  // The header shows the Gameweek being worked on: on "Pick team" that's the next one.
  const h = tab === 'pick' && next.data ? next.data : m;
  const hOpen = !!h && h.status === 'upcoming' && new Date(h.deadline).getTime() > now;

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
                {h!.cup_name} · {h!.season_name}
              </p>
              <h1 className="display" style={{ margin: '4px 0 0', fontSize: 'clamp(28px,4vw,40px)' }}>
                {t('fantasy.md.number', { n: h!.number })}
              </h1>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 14.5 }}>
                {dateFmt(h!.window_start)} – {dateFmt(h!.window_end)}
              </p>
            </div>
            <div className="fantasy-md__status" data-status={hOpen ? 'open' : h!.status}>
              {hOpen ? t('fantasy.md.deadlineIn', { t: untilText(h!.deadline, now) ?? '' }) : h!.status === 'scored' ? t('fantasy.md.scored') : h!.status === 'live' ? '● ' + t('fantasy.md.live') : t('fantasy.md.locked')}
              <small>{hOpen ? t('fantasy.md.deadlineAt', { date: dateFmt(h!.deadline) }) : t('fantasy.md.players', { n: h!.players })}</small>
            </div>
          </header>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
            {m.previous_id && (
              <Link to={'/fantasy/matchday/' + m.previous_id} className="btn btn--ghost btn--sm">
                ← {t('fantasy.md.prev')}
              </Link>
            )}
            <span style={{ flex: 1 }} />
            <Segmented label={t('fantasy.md.title')} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} options={tabs} />
          </div>
          <Notice style={{ marginTop: 14 }}>{h!.international ? t('fantasy.md.international') : t('fantasy.md.clubsOnly')}</Notice>

          {tab === 'lineup' && <LineupEditor m={m} />}
          {tab === 'points' && <LineupView m={m} fixtures={fixtures.data ?? []} />}
          {tab === 'pick' && nextId && (next.data ? <LineupEditor m={next.data} pickFor /> : <Skeleton height={300} radius={24} style={{ marginTop: 18 }} />)}
          {tab === 'fixtures' && <Fixtures rows={fixtures.data ?? []} loading={fixtures.isLoading} />}
          {tab === 'table' && <Table m={m} />}
        </>
      )}
    </Page>
  );
}

function LineupEditor({ m, pickFor = false }: { m: Matchday; pickFor?: boolean }) {
  const { t, lang } = usePrefs();
  const { user } = useSession();
  const squad = useQuery({ queryKey: ['fantasySquad', m.id, user?.id], queryFn: () => db.loadSquadClubs(m.id), enabled: !!user, staleTime: 15_000, retry: false });
  const sq = (m.squad as SquadState | null) ?? null;
  if (!user)
    return (
      <div style={{ marginTop: 18 }}>
        <Link to="/signin" state={{ from: '/fantasy/matchday' }} className="btn btn--primary">
          {t('fantasy.signin')}
        </Link>
      </div>
    );
  if (!sq || sq.clubs.length < FANTASY.squadSize)
    return (
      <Notice style={{ marginTop: 18 }}>
        {t('fantasy.md.noSquad')}{' '}
        <Link to="/fantasy/squad">{t('fantasy.sq.build')}</Link>
      </Notice>
    );
  if (!squad.data) return <Skeleton height={300} radius={24} style={{ marginTop: 18 }} />;
  // The form starts from the line-up as the server has it (set, carried or picked by the game).
  return (
    <>
      {pickFor && (
        <Notice style={{ marginTop: 14 }}>
          {t('fantasy.md.pickFor', { n: m.number, date: new Date(m.deadline).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: FANTASY.timeZone }) })}
          {' · '}
          {t('fantasy.sq.free', { n: sq.free_transfers })}
        </Notice>
      )}
      <LineupForm key={squad.data.map((c) => c.club_id + (c.starter ? '*' : '') + (c.captain ? 'C' : '')).join(',')} m={m} clubs={squad.data} />
    </>
  );
}

function LineupForm({ m, clubs }: { m: Matchday; clubs: SquadClub[] }) {
  const { t } = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const l = (m.lineup as MatchdayLineup | null) ?? null;
  const [starters, setStarters] = useState<string[]>(() => {
    const five = clubs.filter((c) => c.starter).map((c) => c.club_id);
    const rest = [...clubs].filter((c) => !five.includes(c.club_id)).sort((a, b) => Number(b.plays) - Number(a.plays) || Number(b.price) - Number(a.price));
    return [...five, ...rest.map((c) => c.club_id)].slice(0, FANTASY.starters);
  });
  const [captain, setCaptain] = useState<string | null>(() => clubs.find((c) => c.captain)?.club_id ?? null);
  // Substituting: first the question, then the bench lights up to choose from.
  const [ask, setAsk] = useState<SquadClub | null>(null);
  const [outId, setOutId] = useState<string | null>(null);
  const byId = useMemo(() => new Map(clubs.map((c) => [c.club_id, c])), [clubs]);
  const chip = (l?.chip as Chip | null) ?? null;
  const usedChips = new Set(m.chips_used ?? []);
  const captainClub = captain ? byId.get(captain) : undefined;

  // On the pitch: ask to substitute. On the bench: come on for the one going off (or fill a free place).
  const tap = (c: SquadClub) => {
    if (starters.includes(c.club_id)) {
      if (outId === c.club_id) setOutId(null);
      else setAsk(c);
      return;
    }
    if (outId) {
      setStarters(starters.map((x) => (x === outId ? c.club_id : x)));
      if (captain === outId) setCaptain(null);
      setOutId(null);
    } else if (starters.length < FANTASY.starters) {
      setStarters([...starters, c.club_id]);
    }
  };
  const makeCaptain = (c: SquadClub) => {
    if (!c.owned) {
      toast(t('fantasy.md.err.captain'));
      return;
    }
    if (!starters.includes(c.club_id)) return;
    setCaptain(captain === c.club_id ? null : c.club_id);
  };
  const save = useMutation({
    // The bench in the order shown: the leftmost comes on first if a starter has no match.
    mutationFn: () => db.saveLineup(m.id, starters, captain, bench.map((c) => c.club_id)),
    onSuccess: () => {
      toast(t('fantasy.md.saved'));
      void qc.invalidateQueries({ queryKey: ['fantasyMatchday'] });
      void qc.invalidateQueries({ queryKey: ['fantasySquad'] });
    },
    onError: (e) => toast(errorText(t, (e as { code?: string }).code))
  });
  const play = useMutation({
    mutationFn: (c: Chip | null) => db.playChip(m.id, c),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['fantasyMatchday'] }),
    onError: (e) => toast(errorText(t, (e as { code?: string }).code))
  });
  const bench = clubs.filter((c) => !starters.includes(c.club_id));
  const idle = starters.filter((id) => byId.get(id) && !byId.get(id)!.plays).length;
  return (
    <div className="fantasy-md">
      <section className="card fantasy-md__squad" aria-label={t('fantasy.md.tab.lineup')}>
        <div className="fantasy-panel__head">
          <h2 className="title" style={{ margin: 0 }}>
            {t('fantasy.md.slots', { n: starters.length, total: FANTASY.starters })}
          </h2>
          <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {captainClub ? 'C: ' + captainClub.name : t('fantasy.md.noCaptainYet')}
          </span>
        </div>
        <Pitch
          slots={[...Array.from({ length: FANTASY.starters }, (_, i) => (starters[i] ? (byId.get(starters[i]!) ?? null) : null)), ...bench]}
          onTap={(i) => {
            const c = i < FANTASY.starters ? (starters[i] ? byId.get(starters[i]!) : undefined) : bench[i - FANTASY.starters];
            if (c) tap(c);
          }}
          onCaptain={(i) => {
            const c = starters[i] ? byId.get(starters[i]!) : undefined;
            if (c) makeCaptain(c);
          }}
          captainId={captain}
          benchDim={chip !== 'bench_boost'}
          outId={outId}
        />
        {outId && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--pos)', fontWeight: 600 }}>
            {t('fantasy.md.subHint', { club: byId.get(outId)?.name ?? '' })}{' '}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOutId(null)} style={{ marginLeft: 6 }}>
              {t('fantasy.md.subCancel')}
            </button>
          </p>
        )}
        {idle > 0 && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--neg)' }}>{t('fantasy.md.idleWarn', { n: idle })}</p>}
        <p className="fantasy-panel__fine">{t('fantasy.md.pitchHint')}</p>
        <MyFixtures m={m} clubs={clubs} />
        <div className="fantasy-md__opts">
          <div>
            <p className="fantasy-md__label">{t('fantasy.md.captain')}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{t('fantasy.md.captainBody', { m: FANTASY.captainMult })}</p>
            {!clubs.some((c) => c.owned) && (
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                <Link to="/vault/add/library">{t('fantasy.md.addShirt')}</Link>
              </p>
            )}
          </div>
          <div>
            <p className="fantasy-md__label">{t('fantasy.md.chip')}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="option-btn" aria-pressed={chip === 'bench_boost'} disabled={usedChips.has('bench_boost') || play.isPending || chip === 'wildcard' || chip === 'free_hit'} onClick={() => play.mutate(chip === 'bench_boost' ? null : 'bench_boost')} title={t('fantasy.md.chip.bench_boost.body')} style={{ padding: '6px 11px', fontSize: 12.5 }}>
                {t('fantasy.md.chip.bench_boost')}
                {usedChips.has('bench_boost') && <small style={{ marginLeft: 6, color: 'var(--muted)' }}>{t('fantasy.md.chipUsed')}</small>}
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              {chip ? t('fantasy.md.chip.' + chip + '.body') : t('fantasy.md.chipNote')}
              {(chip === 'wildcard' || chip === 'free_hit') && (
                <>
                  {' '}
                  <Link to="/fantasy/squad">{t('fantasy.sq.transfers')} →</Link>
                </>
              )}
            </p>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button onClick={() => save.mutate()} disabled={starters.length !== FANTASY.starters} busy={save.isPending}>
            {t('fantasy.md.save')}
          </Button>
          <Link to="/fantasy/squad" className="btn btn--secondary">
            {t('fantasy.sq.transfers')}
          </Link>
          {l && l.hits > 0 && <span style={{ fontSize: 13, color: 'var(--neg)' }}>{t('fantasy.sq.hits', { n: l.hits })}</span>}
        </div>
      </section>
      {ask && (
        <Dialog open onClose={() => setAsk(null)} title={t('fantasy.md.subTitle', { club: ask.name })} width={380}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>{t('fantasy.md.subBody')}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <Button
              onClick={() => {
                setOutId(ask.club_id);
                setAsk(null);
              }}
            >
              {t('fantasy.md.subGo')}
            </Button>
            <Button variant="ghost" onClick={() => setAsk(null)}>
              {t('fantasy.md.subCancel')}
            </Button>
          </div>
        </Dialog>
      )}
      <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        <b>{t('fantasy.md.scoringTitle')}:</b> {t('fantasy.md.scoring', { win: FANTASY.points.win, draw: FANTASY.points.draw, cap: FANTASY.captainMult })}
      </p>
    </div>
  );
}

// What a club did (or will do) this Gameweek, in a few words: the score, or the kick-off.
function clubLine(c: LineupClub, fixtures: Fixture[], lang: string, t: (k: string) => string): string {
  const matches = (c.detail as { matches?: { home: string; away: string; score: string; status: string }[] })?.matches ?? [];
  if (matches.length) return matches.map((x) => `${x.home} ${x.score} ${x.away}${x.status === 'live' ? ' · live' : ''}`).join(' · ');
  const f = fixtures.find((x) => x.home_club_id === c.club_id || x.away_club_id === c.club_id);
  if (!f) return t('fantasy.md.noMatch');
  const when = new Date(f.kickoff).toLocaleString(lang, { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: FANTASY.timeZone });
  return `${when} · ${f.home_name} – ${f.away_name}`;
}

// The opponent alone, for the label under a jersey on the pitch.
function opponent(c: LineupClub, fixtures: Fixture[]): string | null {
  const f = fixtures.find((x) => x.home_club_id === c.club_id || x.away_club_id === c.club_id);
  if (!f) return null;
  const home = f.home_club_id === c.club_id;
  return `${home ? f.away_name : f.home_name} (${home ? 'H' : 'A'})`;
}

// Bench clubs show what they would have scored (greyed, not in the total).
// An automatic substitution (a starter without a match by Monday 23:30 → the leftmost bench club that played).
function subNote(c: LineupClub, rows: LineupClub[], t: (k: string, v?: Record<string, string | number>) => string): string | null {
  const d = (c.detail ?? {}) as { sub_in_for?: string | null; sub_out?: boolean | null };
  if (d.sub_in_for) return t('fantasy.md.subIn', { club: rows.find((x) => x.club_id === d.sub_in_for)?.name ?? d.sub_in_for });
  if (d.sub_out) return t('fantasy.md.subOut');
  return null;
}

function PointsPitch({ rows, fixtures }: { rows: LineupClub[]; fixtures: Fixture[] }) {
  const { t } = usePrefs();
  const starters = rows.filter((c) => c.starter);
  const bench = rows.filter((c) => !c.starter);
  const model = (c: LineupClub) => ({ club_id: c.club_id, name: c.name, league: c.league, price: c.price, image_path: c.image_path, points: c.multiplier > 0 ? c.total : c.base, counts: c.multiplier > 0, sub: subNote(c, rows, t) ?? opponent(c, fixtures) });
  return (
    <Pitch
      slots={[...Array.from({ length: FANTASY.starters }, (_, i) => (starters[i] ? model(starters[i]!) : null)), ...bench.map(model)]}
      captainId={rows.find((c) => c.captain)?.club_id ?? null}
      benchDim={!rows.some((c) => !c.starter && c.multiplier > 0)}
    />
  );
}

function LineupView({ m, fixtures }: { m: Matchday; fixtures: Fixture[] }) {
  const { t } = usePrefs();
  const { user, profile } = useSession();
  const toast = useToast();
  const [params] = useSearchParams();
  const [view, setView] = useState<'pitch' | 'list'>('pitch');
  const standing = useQuery({ queryKey: ['fantasyStanding', user?.id], queryFn: db.loadMyStanding, enabled: !!user, staleTime: 30_000, retry: false });
  const stats = useQuery({ queryKey: ['fantasyMdStats', m.id], queryFn: () => db.loadMatchdayStats(m.id), staleTime: 30_000, retry: false });
  // Someone else's locked line-up (from a league's pairings or the table).
  const other = params.get('user');
  const otherHandle = params.get('handle');
  const clubs = useQuery({ queryKey: ['fantasyLineupClubs', m.id, other ?? user?.id], queryFn: () => db.loadLineupClubs(m.id, other ?? undefined), enabled: !!user || !!other, staleTime: 30_000, retry: false });
  const l = (m.lineup as MatchdayLineup | null) ?? null;
  const rows = clubs.data ?? [];
  const toggle = (
    <Segmented label={t('fantasy.md.tab.points')} value={view} onChange={(v) => setView(v as 'pitch' | 'list')} options={[{ value: 'pitch', label: t('fantasy.md.view.pitch') }, { value: 'list', label: t('fantasy.md.view.list') }]} />
  );
  const body = (
    <>
      {clubs.isLoading && <Skeleton height={300} radius={16} style={{ marginTop: 12 }} />}
      {rows.length > 0 && (view === 'pitch' ? <PointsPitch rows={rows} fixtures={fixtures} /> : <ScoreRows rows={rows} fixtures={fixtures} />)}
      <MyFixtures m={m} clubs={rows} theirs={!!other} />
    </>
  );
  if (other) {
    const total = rows.reduce((a, c) => a + c.total, 0);
    return (
      <div className="fantasy-md">
        <section className="card fantasy-md__squad">
          <div className="fantasy-panel__head">
            <h2 className="title" style={{ margin: 0 }}>
              {t('fantasy.md.lineupOf', { handle: otherHandle ?? '?' })}: <span className="mono">{total}</span>
            </h2>
            {toggle}
          </div>
          {body}
          <p style={{ margin: '14px 0 0', display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13.5 }}>
            <Link to="?tab=table">← {t('fantasy.md.tab.table')}</Link>
            {otherHandle && <Link to={'/u/' + otherHandle}>{t('fantasy.md.profileOf', { handle: otherHandle })}</Link>}
          </p>
        </section>
      </div>
    );
  }
  if (!user)
    return (
      <div style={{ marginTop: 18 }}>
        <Link to="/signin" state={{ from: '/fantasy/matchday' }} className="btn btn--primary">
          {t('fantasy.signin')}
        </Link>
      </div>
    );
  if (!l) return <Notice style={{ marginTop: 18 }}>{t('fantasy.md.noLineup')}</Notice>;
  const s = stats.data;
  return (
    <div className="fantasy-md">
      {/* The board, as in Fantasy Premier League: average and highest, mine in the middle, rank and transfers. */}
      <section className="fantasy-board" aria-label={t('fantasy.md.myPoints')}>
        <div className="fantasy-board__stat">
          <b className="mono">{s && s.managers ? s.avg_points : '–'}</b>
          <small>{t('fantasy.md.avgPoints')}</small>
        </div>
        <div className="fantasy-board__stat">
          <b className="mono">{s && s.managers ? s.top_points : '–'}</b>
          <small>{t('fantasy.md.topPoints')}</small>
        </div>
        <div className="fantasy-board__main">
          <b className="mono">{l.points}</b>
          <small>{m.status === 'scored' ? t('fantasy.md.finalPoints') : t('fantasy.md.livePoints')}</small>
        </div>
        <div className="fantasy-board__stat">
          <b className="mono">{m.rank ? `${m.rank}/${m.players}` : '–'}</b>
          <small>{t('fantasy.md.gwRank')}</small>
        </div>
        <div className="fantasy-board__stat">
          <b className="mono">
            {l.transfers}
            {l.hits > 0 && <span className="fantasy-board__hit">−{l.hits}</span>}
          </b>
          <small>{t('fantasy.md.transfersMade')}</small>
        </div>
      </section>
      <section className="card fantasy-md__squad" style={{ marginTop: 14 }}>
        <div className="fantasy-panel__head">
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            {m.status === 'scored' ? t('fantasy.md.scored') : m.status === 'live' ? '● ' + t('fantasy.md.live') : t('fantasy.md.locked')}
            {standing.data && <> · {t('fantasy.md.seasonPoints', { n: standing.data.season_points + (m.status === 'scored' ? 0 : l.points) })}</>}
            {l.chip && <> · {t('fantasy.md.chip.' + l.chip)}</>}
          </p>
          {toggle}
        </div>
        {l.carried && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>{t('fantasy.md.carried')}</p>}
        {body}
        {m.status === 'scored' && rows.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                shareFantasy({ kicker: t('fantasy.md.number', { n: m.number }), title: t('fantasy.share.matchday', { n: m.number, points: l.points }), subtitle: m.rank ? t('fantasy.share.rank', { rank: m.rank, n: m.players }) : undefined, stat: String(l.points), cards: rows.filter((c) => c.starter).map((c) => ({ src: c.image_path ?? undefined, tone: c.captain ? 'gold' : 'common', label: `${c.name} · ${c.total}` })), handle: profile?.handle ?? null, link: SITE_URL + '/fantasy/matchday/' + m.id }, t('fantasy.share.matchday', { n: m.number, points: l.points }))
                  .then((how) => how === 'downloaded' && toast(t('fantasy.share.saved')))
                  .catch(() => {})
              }
            >
              {t('fantasy.share.card')}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function ScoreRows({ rows, fixtures }: { rows: LineupClub[]; fixtures: Fixture[] }) {
  const { t } = usePrefs();
  const starters = rows.filter((c) => c.starter);
  const bench = rows.filter((c) => !c.starter);
  return (
    <>
      <ul className="fantasy-md__scores">
        {starters.map((c) => (
          <ScoreRow key={c.club_id} c={c} fixtures={fixtures} />
        ))}
      </ul>
      {bench.length > 0 && (
        <>
          <p className="fantasy-md__label" style={{ marginTop: 12 }}>
            {t('fantasy.md.bench')}
          </p>
          <ul className="fantasy-md__scores">
            {bench.map((c) => (
              <ScoreRow key={c.club_id} c={c} fixtures={fixtures} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function ScoreRow({ c, fixtures }: { c: LineupClub; fixtures: Fixture[] }) {
  const { t, lang } = usePrefs();
  return (
    <li className={'fantasy-md__scorerow' + (c.captain ? ' is-captain' : '') + (!c.starter && c.multiplier === 0 ? ' is-bench' : '')}>
      <span className="fantasy-md__thumb">{c.image_path ? <img src={c.image_path} alt="" loading="lazy" /> : null}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
        <b style={{ fontSize: 13.5 }}>
          {c.name} {c.captain && <span className="fantasy-md__captag">C</span>}
        </b>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {clubLine(c, fixtures, lang, t)}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          {t('fantasy.md.base', { n: c.base })} · {t('fantasy.md.multiplier', { m: c.multiplier })} · {priceText(c.price)}
        </span>
      </span>
      <b className="mono" style={{ fontSize: 18 }}>
        {c.total}
      </b>
    </li>
  );
}

/** Your clubs' matches of this Gameweek under the pitch: when they play, the score so far or at full time. */
function MyFixtures({ m, clubs, theirs = false }: { m: Matchday; clubs: { club_id: string; name: string }[]; theirs?: boolean }) {
  const { t } = usePrefs();
  const fixtures = useQuery({ queryKey: ['fantasyFixtures', m.id], queryFn: () => db.loadFixtures(m.id), staleTime: 60_000, retry: false });
  const mine = new Set(clubs.map((c) => c.club_id));
  const rows = (fixtures.data ?? []).filter((f) => mine.has(f.home_club_id ?? '') || mine.has(f.away_club_id ?? ''));
  const playing = new Set(rows.flatMap((f) => [f.home_club_id, f.away_club_id]));
  const idle = clubs.filter((c) => !playing.has(c.club_id));
  if (!clubs.length) return null;
  return (
    <section className="fantasy-myfix" aria-labelledby="myfix-title">
      <h3 id="myfix-title" className="fantasy-md__label" style={{ margin: 0 }}>
        {t(theirs ? 'fantasy.md.theirFixtures' : 'fantasy.md.myFixtures')}
      </h3>
      {fixtures.isLoading ? <Skeleton height={120} radius={16} style={{ marginTop: 10 }} /> : <Fixtures rows={rows} loading={false} mine={mine} compact />}
      {!fixtures.isLoading && idle.length > 0 && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--muted)' }}>{t('fantasy.md.noMatchFor', { clubs: idle.map((c) => c.name).join(', ') })}</p>}
    </section>
  );
}

function Fixtures({ rows, loading, mine, compact = false }: { rows: Fixture[]; loading: boolean; mine?: Set<string>; compact?: boolean }) {
  const { t, lang } = usePrefs();
  if (loading) return <Skeleton height={240} radius={20} style={{ marginTop: 18 }} />;
  if (!rows.length) return mine ? null : <Notice style={{ marginTop: 18 }}>{t('fantasy.md.fixturesNone')}</Notice>;
  const team = (id: string | null) => 'fantasy-fixture__team' + (mine?.has(id ?? '') ? ' is-mine' : '');
  const groups = new Map<string, Fixture[]>();
  for (const f of rows) {
    const k = new Date(f.kickoff).toLocaleString(lang, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: FANTASY.timeZone });
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  return (
    <div style={{ marginTop: compact ? 10 : 18, display: 'grid', gap: compact ? 12 : 18 }}>
      {[...groups].map(([k, list]) => (
        <section key={k}>
          <h2 className="title" style={{ margin: '0 0 8px', fontSize: compact ? 13.5 : 15, color: compact ? 'var(--text-2)' : undefined }}>
            {k}
          </h2>
          <ul className="fantasy-fixtures">
            {list.map((f) => (
              <li key={f.id} className={'fantasy-fixture is-' + f.status}>
                <span className={team(f.home_club_id)}>
                  {f.home_image ? <img src={f.home_image} alt="" loading="lazy" /> : <span className="fantasy-fixture__noimg" aria-hidden="true">👕</span>}
                  {f.home_name}
                </span>
                <span className="fantasy-fixture__score mono">{f.status === 'scheduled' ? '–' : `${f.home_goals ?? 0}:${f.away_goals ?? 0}`}</span>
                <span className={team(f.away_club_id) + ' is-away'}>
                  {f.away_name}
                  {f.away_image ? <img src={f.away_image} alt="" loading="lazy" /> : <span className="fantasy-fixture__noimg" aria-hidden="true">👕</span>}
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
            {/* Straight to their line-up and points this Gameweek (their profile is one tap further). */}
            <Link to={r.is_me ? '?tab=points' : `?tab=points&user=${r.user_id}&handle=${encodeURIComponent(r.handle)}`} className="fantasy-table__link" style={{ fontWeight: 650 }}>
              @{r.handle}
            </Link>
            {i === 0 && m.status === 'scored' && <span className="fantasy-table__crown"> 👑 {t('fantasy.md.manager')}</span>}
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
              {r.captain_name && 'C: ' + r.captain_name}
              {r.chip && ' · ' + t('fantasy.md.chip.' + r.chip)}
              {' · ' + t('fantasy.md.transfersN', { n: r.transfers })}
              {r.hits > 0 && ' (−' + r.hits + ')'}
            </span>
          </span>
          <b className="mono" style={{ fontSize: 16 }}>
            {r.points}
          </b>
        </li>
      ))}
    </ol>
  );
}
