// The squad: eight jerseys for 100 M, two per league at most — built once,
// then changed by transfers (one free a Gameweek, the rest cost points,
// unless the Wildcard or the Free Hit is played). Every change counts
// against the squad as it stood at the last deadline, so an undo is free.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FANTASY, type Chip } from '../../config/fantasy.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { Jersey, MatchdayLineup, SquadState } from '../../utils/db.ts';
import { Button, Dialog, ErrorState, Notice, Page, Skeleton } from '../../ui/index.ts';
import { JerseyCard } from './JerseyCard.tsx';
import { Pitch } from './Pitch.tsx';
import { priceText, squadProblems, transferHits, transfersMade, untilText } from './model.ts';
import { errorText } from './errors.ts';

type Sort = 'priceDesc' | 'priceAsc' | 'name';
const SORTS: Sort[] = ['priceDesc', 'priceAsc', 'name'];
const bySort = (sort: Sort) => (a: Jersey, b: Jersey) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'priceAsc' ? Number(a.price) - Number(b.price) || a.name.localeCompare(b.name) : Number(b.price) - Number(a.price) || a.name.localeCompare(b.name));

export default function SquadPage() {
  const { t } = usePrefs();
  const { user } = useSession();
  usePageMeta(t('fantasy.sq.title') + ' · Fantasy', t('fantasy.sq.intro', { n: FANTASY.squadSize, budget: FANTASY.budget, per: FANTASY.maxPerLeague }));
  const [now] = useState(() => Date.now());
  const current = useQuery({ queryKey: ['fantasyMatchday', 'current', user?.id], queryFn: () => db.loadMatchday(), enabled: !!user, staleTime: 15_000, retry: false });
  // While a Gameweek runs or waits to be scored, transfers are for the next one.
  const closed = !!current.data && (current.data.status !== 'upcoming' || new Date(current.data.deadline).getTime() <= now);
  const nextId = closed ? current.data?.next_id : null;
  const next = useQuery({ queryKey: ['fantasyMatchday', nextId ?? 'none', user?.id], queryFn: () => db.loadMatchday(nextId!), enabled: !!nextId, staleTime: 15_000, retry: false });
  const md = nextId ? next : current;
  if (!user)
    return (
      <Page narrow>
        <Link to="/signin" state={{ from: '/fantasy/squad' }} className="btn btn--primary">
          {t('fantasy.signin')}
        </Link>
      </Page>
    );
  return (
    <Page>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      {md.isLoading && <Skeleton height={300} radius={24} />}
      {md.isError && <ErrorState what={t('fantasy.sq.title')} onRetry={() => md.refetch()} />}
      {md.data === null && <Notice>{t('fantasy.md.fixturesNone')}</Notice>}
      {md.data && <SquadEditor key={md.data.id} m={md.data} />}
    </Page>
  );
}

function SquadEditor({ m }: { m: NonNullable<Awaited<ReturnType<typeof db.loadMatchday>>> }) {
  const { t, lang } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const jerseys = useQuery({ queryKey: ['fantasyJerseys', m.id, user?.id], queryFn: () => db.loadJerseys(m.id), staleTime: 60_000, retry: false });
  const sq = (m.squad as SquadState | null) ?? null;
  const l = (m.lineup as MatchdayLineup | null) ?? null;
  const [now] = useState(() => Date.now());
  const open = m.status === 'upcoming' && new Date(m.deadline).getTime() > now;
  // Eight places: last week's starters first (they're on the pitch), the rest on the bench.
  const [slots, setSlots] = useState<(string | null)[]>(() => {
    const clubs = sq?.clubs ?? [];
    const first = (l?.starters ?? []).filter((c) => clubs.includes(c));
    const ordered = [...first, ...clubs.filter((c) => !first.includes(c))];
    return Array.from({ length: FANTASY.squadSize }, (_, i) => ordered[i] ?? null);
  });
  const picks = slots.filter((c): c is string => !!c);
  // The picker for one place, and a filled place up close.
  const [pickFor, setPickFor] = useState<number | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [pq, setPq] = useState('');
  const [pLeague, setPLeague] = useState<string>('all');
  const [pSort, setPSort] = useState<Sort>('priceDesc');
  const [league, setLeague] = useState<string>('all');
  const [sort, setSort] = useState<Sort>('priceDesc');
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<'all' | 'plays' | 'owned'>('all');
  const byId = useMemo(() => new Map((jerseys.data ?? []).map((j) => [j.club_id, j])), [jerseys.data]);
  const chosen = picks.map((id) => byId.get(id)).filter((j): j is Jersey => !!j);
  const locked = sq?.first_locked ? sq.locked_clubs : [];
  const price = (id: string) => Number(byId.get(id)?.price ?? 0);
  // Money: what was in the bank at the deadline, plus what left, minus what came in.
  const bank = (sq?.first_locked ? sq.bank_locked : FANTASY.budget) + locked.filter((c) => !picks.includes(c)).reduce((a, c) => a + price(c), 0) - picks.filter((c) => !locked.includes(c)).reduce((a, c) => a + price(c), 0);
  const check = squadProblems(chosen.map((j) => ({ club_id: j.club_id, league: j.league, price: Number(j.price), is_national: j.is_national })), bank + chosen.reduce((a, j) => a + Number(j.price), 0));
  const chip = (l?.chip as Chip | null) ?? null;
  const transfers = sq?.first_locked ? transfersMade(locked, picks) : 0;
  const hits = transferHits(transfers, sq?.free_transfers ?? FANTASY.freeTransfers, chip, !!sq?.first_locked);
  const changed = JSON.stringify([...picks].sort()) !== JSON.stringify([...(sq?.clubs ?? [])].sort());
  const leagues = useMemo(() => [...new Set((jerseys.data ?? []).map((j) => j.league))].sort((a, b) => a.localeCompare(b)), [jerseys.data]);
  const leagueCount = (lg: string) => chosen.filter((j) => j.league === lg && !j.is_national).length;

  const setSlot = (i: number, id: string | null) => setSlots(slots.map((c, k) => (k === i ? id : c)));
  // From the market: into the first free place, or out again.
  const toggle = (j: Jersey) => {
    if (!open) return;
    const at = slots.indexOf(j.club_id);
    if (at >= 0) setSlot(at, null);
    else {
      const free = slots.indexOf(null);
      if (free >= 0) setSlot(free, j.club_id);
    }
  };
  const leagueFull = (j: Jersey) => !j.is_national && leagueCount(j.league) >= FANTASY.maxPerLeague;
  const tooDear = (j: Jersey) => Number(j.price) > bank + (pickFor !== null && slots[pickFor] ? price(slots[pickFor]!) : 0);
  const save = useMutation({
    mutationFn: async () => {
      await db.saveSquad(picks, m.id);
      // The five on the pitch play; the captain stays if still among them.
      const five = slots.slice(0, FANTASY.starters).filter((c): c is string => !!c);
      const cap = l?.captain && five.includes(l.captain) ? l.captain : null;
      await db.saveLineup(m.id, five, cap).catch(() => undefined);
    },
    onSuccess: () => {
      toast(t('fantasy.sq.saved'));
      void qc.invalidateQueries({ queryKey: ['fantasyMatchday'] });
      void qc.invalidateQueries({ queryKey: ['fantasySquad'] });
      void qc.invalidateQueries({ queryKey: ['fantasyJerseys'] });
      if (!sq?.first_locked && !sq?.clubs.length) navigate('/fantasy/matchday');
    },
    onError: (e) => toast(errorText(t, (e as { code?: string }).code))
  });
  const play = useMutation({
    mutationFn: (c: Chip | null) => db.playChip(m.id, c),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['fantasyMatchday'] }),
    onError: (e) => toast(errorText(t, (e as { code?: string }).code))
  });
  const list = (jerseys.data ?? []).filter((j) => (league === 'all' || j.league === league) && (only === 'all' || (only === 'plays' ? j.plays : j.owned)) && (!q || j.name.toLowerCase().includes(q.toLowerCase()))).sort(bySort(sort));
  const pickList = (jerseys.data ?? [])
    .filter((j) => !picks.includes(j.club_id) && (pLeague === 'all' || j.league === pLeague) && (!pq || j.name.toLowerCase().includes(pq.toLowerCase()) || j.league.toLowerCase().includes(pq.toLowerCase())))
    .sort(bySort(pSort))
    .slice(0, 60);
  const detailJersey = detail !== null && slots[detail] ? byId.get(slots[detail]!) : undefined;
  const usedChips = new Set(m.chips_used ?? []);
  const dateFmt = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: FANTASY.timeZone });

  return (
    <div className="fantasy-md">
      <header className="fantasy-head">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>
            {t('fantasy.md.number', { n: m.number })} · {m.cup_name}
          </p>
          <h1 className="display" style={{ margin: '4px 0 0', fontSize: 'clamp(28px,4vw,40px)' }}>
            {sq?.first_locked ? t('fantasy.sq.transfers') : t('fantasy.sq.build')}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 14.5 }}>{t('fantasy.sq.intro', { n: FANTASY.squadSize, budget: FANTASY.budget, per: FANTASY.maxPerLeague })}</p>
        </div>
        <div className="fantasy-md__status" data-status={open ? 'open' : m.status}>
          {open ? t('fantasy.md.deadlineIn', { t: untilText(m.deadline, now) ?? '' }) : t('fantasy.md.locked')}
          <small>{t('fantasy.md.deadlineAt', { date: dateFmt(m.deadline) })}</small>
        </div>
      </header>
      {!open && <Notice style={{ marginTop: 14 }}>{t('fantasy.sq.closed')}</Notice>}
      {m.international && <Notice style={{ marginTop: 14 }}>{t('fantasy.sq.internationalNote')}</Notice>}

      {/* The eight */}
      <section className="card fantasy-md__squad" style={{ marginTop: 14 }} aria-label={t('fantasy.sq.title')}>
        <div className="fantasy-panel__head">
          <h2 className="title" style={{ margin: 0 }}>
            {t('fantasy.md.slots', { n: picks.length, total: FANTASY.squadSize })}
          </h2>
          <span className="mono" style={{ fontSize: 12.5, color: bank < 0 ? 'var(--neg)' : 'var(--muted)' }}>
            {t('fantasy.sq.bankLeft', { n: priceText(bank) })}
          </span>
        </div>
        <span className="fantasy-progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (check.cost / FANTASY.budget) * 100)}%`, background: bank < 0 ? 'var(--neg)' : undefined }} />
        </span>
        <Pitch
          slots={slots.map((id) => (id ? (byId.get(id) ?? null) : null))}
          onTap={(i) => (slots[i] ? setDetail(i) : (setPq(''), setPLeague('all'), setPickFor(i)))}
          captainId={l?.captain ?? null}
          benchDim={false}
          disabled={!open}
        />
        <p className="fantasy-panel__fine">{t('fantasy.sq.pitchHint')}</p>
        {check.problems.includes('league') && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--neg)' }}>{t('fantasy.sq.err.league', { n: FANTASY.maxPerLeague, league: check.leagues.join(', ') })}</p>}
        {bank < 0 && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--neg)' }}>{t('fantasy.sq.err.budget', { n: priceText(-bank) })}</p>}

        {sq?.first_locked && (
          <div className="fantasy-md__opts">
            <div>
              <p className="fantasy-md__label">{t('fantasy.sq.transfers')}</p>
              <p style={{ margin: 0, fontSize: 14 }}>
                <b>{t('fantasy.sq.made', { n: transfers })}</b> · {t('fantasy.sq.free', { n: sq.free_transfers })}
                {hits > 0 && <span style={{ color: 'var(--neg)' }}> · {t('fantasy.sq.hits', { n: hits })}</span>}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>{t('fantasy.sq.transfersNote', { hit: FANTASY.hitPoints, max: FANTASY.freeTransfersMax })}</p>
            </div>
            <div>
              <p className="fantasy-md__label">{t('fantasy.md.chip')}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['wildcard', 'free_hit'] as const).map((c) => (
                  <button key={c} type="button" className="option-btn" aria-pressed={chip === c} disabled={!open || usedChips.has(c) || play.isPending} onClick={() => play.mutate(chip === c ? null : c)} title={t('fantasy.md.chip.' + c + '.body')} style={{ padding: '6px 11px', fontSize: 12.5 }}>
                    {t('fantasy.md.chip.' + c)}
                    {usedChips.has(c) && <small style={{ marginLeft: 6, color: 'var(--muted)' }}>{t('fantasy.md.chipUsed')}</small>}
                  </button>
                ))}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>{chip === 'wildcard' || chip === 'free_hit' ? t('fantasy.md.chip.' + chip + '.body') : t('fantasy.sq.chipNote')}</p>
            </div>
          </div>
        )}
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button onClick={() => save.mutate()} disabled={!open || !changed || check.problems.length > 0 || bank < 0} busy={save.isPending}>
            {sq?.first_locked ? t('fantasy.sq.confirm', { n: transfers }) : t('fantasy.sq.save')}
          </Button>
          {changed && (
            <Button variant="ghost" onClick={() => setSlots(Array.from({ length: FANTASY.squadSize }, (_, i) => sq?.clubs[i] ?? null))}>
              {t('fantasy.sq.reset')}
            </Button>
          )}
          {sq?.clubs.length === FANTASY.squadSize && !changed && (
            <Link to="/fantasy/matchday" className="btn btn--secondary">
              {t('fantasy.home.setLineup')} →
            </Link>
          )}
        </div>
      </section>

      {/* The market */}
      <section style={{ marginTop: 18 }} aria-label={t('fantasy.sq.market')}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('fantasy.sq.search')} aria-label={t('fantasy.sq.search')} style={{ flex: '1 1 160px', minWidth: 0 }} />
          <select value={league} onChange={(e) => setLeague(e.target.value)} aria-label={t('fantasy.sq.league')} style={{ flex: '0 1 200px' }}>
            <option value="all">{t('fantasy.sq.allLeagues')}</option>
            {leagues.map((lg) => (
              <option key={lg} value={lg}>
                {lg} {leagueCount(lg) ? `(${leagueCount(lg)}/${FANTASY.maxPerLeague})` : ''}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t('fantasy.sq.sort')} style={{ flex: '0 1 150px' }}>
            {SORTS.map((o) => (
              <option key={o} value={o}>
                {t('fantasy.sq.sort.' + o)}
              </option>
            ))}
          </select>
        </div>
        <div role="group" className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, marginTop: 10 }}>
          {(['all', 'plays', 'owned'] as const).map((f) => (
            <button key={f} type="button" className="option-btn" aria-pressed={only === f} onClick={() => setOnly(f)} style={{ padding: '7px 13px', fontSize: 13, flex: 'none' }}>
              {t('fantasy.sq.filter.' + f)}
              <span className="mono" style={{ marginLeft: 6, fontSize: 11.5, color: 'var(--muted)' }}>
                {(jerseys.data ?? []).filter((j) => f === 'all' || (f === 'plays' ? j.plays : j.owned)).length}
              </span>
            </button>
          ))}
        </div>
        {jerseys.isLoading && <Skeleton height={240} radius={20} style={{ marginTop: 14 }} />}
        <ul className="fantasy-squadgrid fantasy-squadgrid--market">
          {list.map((j) => {
            const on = picks.includes(j.club_id);
            const full = !on && (picks.length >= FANTASY.squadSize || leagueFull(j));
            return (
              <li key={j.club_id} className={'fantasy-md__pick' + (on ? ' is-on' : '') + (full ? ' is-idle' : '')}>
                <button type="button" className="fantasy-md__cardbtn" onClick={() => toggle(j)} aria-pressed={on} disabled={!open || full} aria-label={`${j.name} · ${priceText(j.price)}`}>
                  <JerseyCard j={{ ...j, captain: false }} />
                </button>
                {j.picked_pct > 0 && <span className="fantasy-jersey__pct mono">{t('fantasy.sq.picked', { n: j.picked_pct })}</span>}
              </li>
            );
          })}
        </ul>
        {jerseys.data && !list.length && <Notice style={{ marginTop: 14 }}>{t('fantasy.sq.none')}</Notice>}
      </section>
      {pickFor !== null && (
        <Dialog open onClose={() => setPickFor(null)} title={t('fantasy.sq.pick')} width={460}>
          <input type="search" autoFocus value={pq} onChange={(e) => setPq(e.target.value)} placeholder={t('fantasy.sq.search')} aria-label={t('fantasy.sq.search')} style={{ width: '100%' }} />
          <div role="group" aria-label={t('fantasy.sq.league')} className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginTop: 8 }}>
            {['all', ...leagues].map((lg) => (
              <button key={lg} type="button" className="option-btn" aria-pressed={pLeague === lg} onClick={() => setPLeague(lg)} style={{ padding: '5px 10px', fontSize: 12.5, flex: 'none' }}>
                {lg === 'all' ? t('fantasy.sq.allLeagues') : lg}
                {lg !== 'all' && leagueCount(lg) > 0 && <span className="mono" style={{ marginLeft: 4, fontSize: 11, color: 'var(--muted)' }}>{leagueCount(lg)}/{FANTASY.maxPerLeague}</span>}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t('fantasy.sq.sort')} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {SORTS.map((o) => (
              <button key={o} type="button" className="option-btn" aria-pressed={pSort === o} onClick={() => setPSort(o)} style={{ padding: '5px 10px', fontSize: 12.5 }}>
                {t('fantasy.sq.sort.' + o)}
              </button>
            ))}
          </div>
          <ul className="fantasy-picklist">
            {pickList.map((j) => {
              const no = leagueFull(j) ? t('fantasy.sq.leagueFull', { league: j.league, n: FANTASY.maxPerLeague }) : tooDear(j) ? t('fantasy.sq.tooDear') : null;
              return (
                <li key={j.club_id}>
                  <button
                    type="button"
                    disabled={!!no}
                    onClick={() => {
                      setSlot(pickFor, j.club_id);
                      setPickFor(null);
                    }}
                  >
                    {j.image_path && <img src={j.image_path} alt="" loading="lazy" />}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>{j.name}</b>
                      <small>
                        {j.league}
                        {j.owned ? ' · 👕' : ''}
                        {no ? ' · ' + no : j.fixture ? ' · ' + j.fixture : ''}
                      </small>
                    </span>
                    <b className="mono">{priceText(j.price)}</b>
                  </button>
                </li>
              );
            })}
            {!pickList.length && <li style={{ color: 'var(--muted)', fontSize: 13.5, padding: 8 }}>{t('fantasy.sq.none')}</li>}
          </ul>
        </Dialog>
      )}
      {detail !== null && detailJersey && (
        <Dialog open onClose={() => setDetail(null)} title={detailJersey.name} width={380}>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
            <div style={{ width: 160 }}>
              <JerseyCard j={{ ...detailJersey, captain: l?.captain === detailJersey.club_id }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={!open}
                onClick={() => {
                  setSlot(detail, null);
                  setDetail(null);
                }}
              >
                {t('fantasy.sq.remove')}
              </Button>
              <Button
                size="sm"
                disabled={!open}
                onClick={() => {
                  setPq('');
                  setPickFor(detail);
                  setDetail(null);
                }}
              >
                {t('fantasy.sq.change')}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
