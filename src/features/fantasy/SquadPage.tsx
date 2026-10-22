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
import { Button, ErrorState, Notice, Page, Skeleton } from '../../ui/index.ts';
import { JerseyCard } from './JerseyCard.tsx';
import { priceText, squadProblems, transferHits, transfersMade, untilText } from './model.ts';
import { errorText } from './errors.ts';

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
  const [picks, setPicks] = useState<string[]>(sq?.clubs ?? []);
  const [league, setLeague] = useState<string>('all');
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

  const toggle = (j: Jersey) => {
    if (!open) return;
    if (picks.includes(j.club_id)) setPicks(picks.filter((c) => c !== j.club_id));
    else if (picks.length < FANTASY.squadSize) setPicks([...picks, j.club_id]);
  };
  const save = useMutation({
    mutationFn: () => db.saveSquad(picks, m.id),
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
  const list = (jerseys.data ?? []).filter((j) => (league === 'all' || j.league === league) && (only === 'all' || (only === 'plays' ? j.plays : j.owned)) && (!q || j.name.toLowerCase().includes(q.toLowerCase())));
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
        <ul className="fantasy-squadgrid fantasy-squadgrid--slots">
          {Array.from({ length: FANTASY.squadSize }, (_, i) => {
            const j = chosen[i];
            return (
              <li key={j?.club_id ?? i}>
                {j ? (
                  <button type="button" className="fantasy-md__cardbtn" onClick={() => toggle(j)} aria-label={`${j.name} · ${priceText(j.price)}`} disabled={!open}>
                    <JerseyCard j={{ ...j, captain: false }} small />
                  </button>
                ) : (
                  <span className="fantasy-jersey is-small is-empty">?</span>
                )}
              </li>
            );
          })}
        </ul>
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
            <Button variant="ghost" onClick={() => setPicks(sq?.clubs ?? [])}>
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
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('fantasy.sq.search')} aria-label={t('fantasy.sq.search')} className="input" style={{ flex: '1 1 160px', minWidth: 0 }} />
          <select value={league} onChange={(e) => setLeague(e.target.value)} aria-label={t('fantasy.sq.league')} className="input" style={{ flex: '0 1 200px' }}>
            <option value="all">{t('fantasy.sq.allLeagues')}</option>
            {leagues.map((lg) => (
              <option key={lg} value={lg}>
                {lg} {leagueCount(lg) ? `(${leagueCount(lg)}/${FANTASY.maxPerLeague})` : ''}
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
            const full = !on && (picks.length >= FANTASY.squadSize || (!j.is_national && leagueCount(j.league) >= FANTASY.maxPerLeague));
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
    </div>
  );
}
