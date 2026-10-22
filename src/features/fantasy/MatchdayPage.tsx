// The Gameweek: pick five of the squad's eight to play (one the captain —
// a club whose shirt you own), play Bench Boost if you like, before Friday
// 18:00; once locked, watch the clubs score with their real results;
// afterwards the table.
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
import { Button, ErrorState, Notice, Page, Segmented, Skeleton } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { Pitch } from './Pitch.tsx';
import { priceText, untilText } from './model.ts';
import { errorText } from './errors.ts';
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
  const dateFmt = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: FANTASY.timeZone });

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
              <small>{open ? t('fantasy.md.deadlineAt', { date: dateFmt(m.deadline) }) : t('fantasy.md.players', { n: m.players })}</small>
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

          {tab === 'lineup' && (open ? <LineupEditor m={m} /> : <LineupView m={m} />)}
          {tab === 'fixtures' && <Fixtures rows={fixtures.data ?? []} loading={fixtures.isLoading} />}
          {tab === 'table' && <Table m={m} />}
        </>
      )}
    </Page>
  );
}

function LineupEditor({ m }: { m: Matchday }) {
  const { t } = usePrefs();
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
  return <LineupForm key={squad.data.map((c) => c.club_id + (c.starter ? '*' : '') + (c.captain ? 'C' : '')).join(',')} m={m} clubs={squad.data} />;
}

function LineupForm({ m, clubs }: { m: Matchday; clubs: SquadClub[] }) {
  const { t } = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const l = (m.lineup as MatchdayLineup | null) ?? null;
  const [starters, setStarters] = useState<string[]>(() => clubs.filter((c) => c.starter).map((c) => c.club_id));
  const [captain, setCaptain] = useState<string | null>(() => clubs.find((c) => c.captain)?.club_id ?? null);
  const byId = useMemo(() => new Map(clubs.map((c) => [c.club_id, c])), [clubs]);
  const chip = (l?.chip as Chip | null) ?? null;
  const usedChips = new Set(m.chips_used ?? []);
  const captainClub = captain ? byId.get(captain) : undefined;

  const toggle = (c: SquadClub) => {
    if (starters.includes(c.club_id)) {
      setStarters(starters.filter((x) => x !== c.club_id));
      if (captain === c.club_id) setCaptain(null);
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
    mutationFn: () => db.saveLineup(m.id, starters, captain),
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
            if (c) toggle(c);
          }}
          onCaptain={(i) => {
            const c = starters[i] ? byId.get(starters[i]!) : undefined;
            if (c) makeCaptain(c);
          }}
          captainId={captain}
          benchDim={chip !== 'bench_boost'}
        />
        {idle > 0 && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--neg)' }}>{t('fantasy.md.idleWarn', { n: idle })}</p>}
        <p className="fantasy-panel__fine">{t('fantasy.md.pitchHint')}</p>
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
      <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        <b>{t('fantasy.md.scoringTitle')}:</b> {t('fantasy.md.scoring', { win: FANTASY.points.win, draw: FANTASY.points.draw, cap: FANTASY.captainMult })}
      </p>
    </div>
  );
}

function LineupView({ m }: { m: Matchday }) {
  const { t } = usePrefs();
  const { user, profile } = useSession();
  const toast = useToast();
  const [params] = useSearchParams();
  // Someone else's locked line-up (from a league's pairings).
  const other = params.get('user');
  const otherHandle = params.get('handle');
  const clubs = useQuery({ queryKey: ['fantasyLineupClubs', m.id, other ?? user?.id], queryFn: () => db.loadLineupClubs(m.id, other ?? undefined), enabled: !!user || !!other, staleTime: 30_000, retry: false });
  const l = (m.lineup as MatchdayLineup | null) ?? null;
  const rows = clubs.data ?? [];
  if (other) {
    const total = rows.reduce((a, c) => a + c.total, 0);
    return (
      <div className="fantasy-md">
        <section className="card fantasy-md__squad">
          <div className="fantasy-panel__head">
            <h2 className="title" style={{ margin: 0 }}>
              {t('fantasy.md.lineupOf', { handle: otherHandle ?? '?' })}: <span className="mono">{total}</span>
            </h2>
          </div>
          {clubs.isLoading && <Skeleton height={200} radius={16} style={{ marginTop: 12 }} />}
          <ScoreRows rows={rows} />
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
        {l.chip && <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t('fantasy.md.chip')}: <b>{t('fantasy.md.chip.' + l.chip)}</b></p>}
        {l.hits > 0 && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--neg)' }}>{t('fantasy.sq.hits', { n: l.hits })}</p>}
        {m.status === 'scored' && rows.length > 0 && (
          <div style={{ marginTop: 10 }}>
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
        {clubs.isLoading && <Skeleton height={200} radius={16} style={{ marginTop: 12 }} />}
        <ScoreRows rows={rows} />
      </section>
    </div>
  );
}

function ScoreRows({ rows }: { rows: LineupClub[] }) {
  const { t } = usePrefs();
  const starters = rows.filter((c) => c.starter);
  const bench = rows.filter((c) => !c.starter);
  return (
    <>
      <ul className="fantasy-md__scores">
        {starters.map((c) => (
          <ScoreRow key={c.club_id} c={c} />
        ))}
      </ul>
      {bench.length > 0 && (
        <>
          <p className="fantasy-md__label" style={{ marginTop: 12 }}>
            {t('fantasy.md.bench')}
          </p>
          <ul className="fantasy-md__scores">
            {bench.map((c) => (
              <ScoreRow key={c.club_id} c={c} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function ScoreRow({ c }: { c: LineupClub }) {
  const { t } = usePrefs();
  const matches = (c.detail as { matches?: { home: string; away: string; score: string; status: string }[] })?.matches ?? [];
  return (
    <li className={'fantasy-md__scorerow' + (c.captain ? ' is-captain' : '') + (!c.starter && c.multiplier === 0 ? ' is-bench' : '')}>
      <span className="fantasy-md__thumb">{c.image_path ? <img src={c.image_path} alt="" loading="lazy" /> : null}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
        <b style={{ fontSize: 13.5 }}>
          {c.name} {c.captain && <span className="fantasy-md__captag">C</span>}
        </b>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {matches.length ? matches.map((x) => `${x.home} ${x.score} ${x.away}${x.status === 'live' ? ' · live' : ''}`).join(' · ') : t('fantasy.md.noMatch')}
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

function Fixtures({ rows, loading }: { rows: Fixture[]; loading: boolean }) {
  const { t, lang } = usePrefs();
  if (loading) return <Skeleton height={240} radius={20} style={{ marginTop: 18 }} />;
  if (!rows.length) return <Notice style={{ marginTop: 18 }}>{t('fantasy.md.fixturesNone')}</Notice>;
  const groups = new Map<string, Fixture[]>();
  for (const f of rows) {
    const k = new Date(f.kickoff).toLocaleString(lang, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: FANTASY.timeZone });
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
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
              {r.captain_name && 'C: ' + r.captain_name}
              {r.chip && ' · ' + t('fantasy.md.chip.' + r.chip)}
              {r.hits > 0 && ' · −' + r.hits}
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
