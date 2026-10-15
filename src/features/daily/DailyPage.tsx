// /daily — the daily shirt puzzle. A zoomed-in crop of one kit from the
// library; every wrong guess zooms out and reveals a hint (kit, league,
// country or decade). Guess
// club and season in five tries; streaks and a shareable grid keep people
// coming back. Guests play too (stored in this browser); members' results
// are saved so streaks follow them across devices.
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shareOrigin } from '../../config/site.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { loadJSON, saveJSON } from '../../utils/storage.ts';
import type { DailyKit } from '../../utils/db.ts';
import { useDailyKit } from './useDailyKit.ts';
import { ClubPicker } from './ClubPicker.tsx';
import * as db from '../../utils/db.ts';
import { Button, Card, ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { MAX_TRIES, RESULTS_KEY, ZOOMS, focusFor, judge, puzzleNumber, shareText, solved, stats, type DayResult, type Guess, type Verdict } from './game.ts';

// v2: guesses are library club ids (v1 held catalogue club names).
const PLAY_KEY = 'kv_daily_play_v2';

type Play = { day: string; guesses: Guess[] };

function useDaily() {
  const { today, kit, loading, error, retry } = useDailyKit();
  const n = puzzleNumber(today);
  const [play, setPlay] = useState<Play>(() => {
    const saved = loadJSON<Play | null>(PLAY_KEY, null);
    return saved?.day === today ? saved : { day: today, guesses: [] };
  });
  useEffect(() => saveJSON(PLAY_KEY, play), [play]);
  return { today, n, answer: kit, loading, error, retry, play, setPlay };
}

/** Clubs play seasons ("2013/14"), national teams years ("2022") — as the library writes them. */
const seasonLabel = (y: number, nation: boolean) => (nation ? String(y) : y + '/' + String((y + 1) % 100).padStart(2, '0'));

export default function DailyPage() {
  const { t, lang } = usePrefs();
  usePageMeta(t('daily.meta'), t('daily.metaDesc'));
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { today, n, answer, loading, error, retry, play, setPlay } = useDaily();

  // The clubs and national teams that can be the answer (the schedule's pool:
  // top five leagues, Swiss Super League, national teams).
  const clubList = useQuery({ queryKey: ['kitClubs'], queryFn: db.loadKitClubs, staleTime: 10 * 60_000 });
  const pool = useMemo(
    () =>
      (clubList.data ?? [])
        .filter((x) => x.top5 || x.league === 'Swiss Super League' || x.league === 'National Teams')
        .map((c) => ({ id: c.id, name: c.name, league: c.league, aliases: c.aliases ?? [] }))
        .sort((a, b) => a.name.localeCompare(b.name, lang)),
    [clubList.data, lang]
  );
  const clubName = useMemo(() => new Map((clubList.data ?? []).map((c) => [c.id, c.name])), [clubList.data]);
  const isNation = (id: string) => clubList.data?.find((c) => c.id === id)?.league === 'National Teams';
  const years = useMemo(() => {
    const hi = Number(today.slice(0, 4));
    return Array.from({ length: hi - 1960 + 1 }, (_, i) => hi - i);
  }, [today]);

  const [club, setClub] = useState('');
  const [year, setYear] = useState('');

  const verdicts: Verdict[] = answer ? play.guesses.map((g) => judge(g, { club: answer.club_id, year: answer.season_year })) : [];
  const won = verdicts.some(solved);
  const done = won || play.guesses.length >= MAX_TRIES;

  // Results: this browser's, plus the member's saved ones (other devices).
  const [local, setLocal] = useState<DayResult[]>(() => loadJSON<DayResult[]>(RESULTS_KEY, []));
  const remote = useQuery({ queryKey: ['dailyResults', user?.id], queryFn: db.loadDailyResults, enabled: !!user, staleTime: 60_000 });
  const results = useMemo(() => {
    const m = new Map<string, DayResult>();
    for (const r of [...(remote.data ?? []), ...local]) m.set(r.day, r);
    return [...m.values()];
  }, [remote.data, local]);
  const save = useMutation({ mutationFn: (r: DayResult) => db.saveDailyResult(user!.id, r), onSuccess: () => qc.invalidateQueries({ queryKey: ['dailyResults', user?.id] }) });

  const record = (r: DayResult) => {
    if (local.some((x) => x.day === r.day)) return;
    const next = [...local, r];
    setLocal(next);
    saveJSON(RESULTS_KEY, next);
    if (user) save.mutate(r);
  };

  if (!answer)
    return (
      <Page narrow>
        <h1 className="display">{t('daily.title')}</h1>
        {loading && <Skeleton height={360} radius={22} style={{ marginTop: 24 }} />}
        {error && <ErrorState what={t('daily.title')} onRetry={retry} />}
      </Page>
    );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const y = Number(year);
    if (!club || !y || done) return;
    const guesses = [...play.guesses, { club, year: y }];
    setPlay({ ...play, guesses });
    const nowWon = solved(judge({ club, year: y }, { club: answer.club_id, year: answer.season_year }));
    if (nowWon || guesses.length >= MAX_TRIES) record({ day: today, won: nowWon, tries: guesses.length });
    setClub('');
    setYear('');
  };

  const zoom = done ? 1 : ZOOMS[Math.min(play.guesses.length, ZOOMS.length - 1)]!;
  const focus = focusFor(answer.club_id + answer.season, n);
  const title = `${answer.club_name} ${answer.season} · ${t('lib.kind.' + answer.kind)}`;
  const s = stats(results, today);
  const share = async () => {
    const text = shareText(n, verdicts, won, t('daily.shareTitle'), shareOrigin() + '/daily');
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      navigator.share({ text }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(text).then(
      () => toast(t('daily.copied')),
      () => toast(text)
    );
  };

  return (
    <Page narrow>
      <div className="eyebrow">{t('daily.eyebrow', { n })}</div>
      <h1 className="display" style={{ fontSize: 'clamp(30px,5vw,48px)', margin: '6px 0 0' }}>
        {t('daily.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', margin: '8px 0 0', fontSize: 15, lineHeight: 1.5 }}>{t('daily.intro', { n: MAX_TRIES })}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 20, marginTop: 24, alignItems: 'start' }}>
        <div>
          <div
            className="card"
            role="img"
            aria-label={done ? title : t('daily.cropLabel', { n: play.guesses.length + 1 })}
            style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', borderRadius: 22, padding: 0, background: 'var(--sunken)' }}
          >
            <div style={{ position: 'absolute', inset: '6%', transform: `scale(${zoom})`, transformOrigin: `${focus.x}% ${focus.y}%`, transition: 'transform .6s cubic-bezier(.2,.7,.2,1)' }}>
              <PuzzleImage kit={answer} />
            </div>
          </div>
          <Hints answer={answer} shown={done ? 3 : play.guesses.length} />
        </div>

        <div>
          <ol aria-label={t('daily.guesses')} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {Array.from({ length: MAX_TRIES }, (_, i) => {
              const g = play.guesses[i];
              const v = verdicts[i];
              return (
                <li key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px', gap: 8 }}>
                  <Cell tone={!v ? 'empty' : v.club ? 'ok' : 'bad'}>{g ? clubName.get(g.club) ?? g.club : ''}</Cell>
                  <Cell tone={!v ? 'empty' : v.season === 'exact' ? 'ok' : v.season === 'close' ? 'close' : 'bad'}>
                    {g ? seasonLabel(g.year, isNation(g.club)) : ''}
                    {v?.dir && <span aria-label={t(v.dir === 'later' ? 'daily.later' : 'daily.earlier')}>{v.dir === 'later' ? ' ↑' : ' ↓'}</span>}
                  </Cell>
                </li>
              );
            })}
          </ol>

          {!done ? (
            <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px', gap: 8, marginTop: 14 }}>
              <ClubPicker clubs={pool} value={club} onChange={setClub} label={t('daily.club')} />
              <label className="sr-only" htmlFor="daily-year">
                {t('daily.year')}
              </label>
              <div className="field">
                <select id="daily-year" value={year} onChange={(e) => setYear(e.target.value)} required>
                  <option value="">{t('daily.year')}</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {seasonLabel(y, isNation(club))}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={!club || !year} style={{ gridColumn: '1 / -1' }}>
                {t('daily.guess', { n: play.guesses.length + 1, max: MAX_TRIES })}
              </Button>
              <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{t('daily.legend')}</p>
            </form>
          ) : (
            <Card style={{ marginTop: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{won ? t('daily.won', { n: play.guesses.length }) : t('daily.lost')}</div>
              <p style={{ margin: '6px 0 0', fontSize: 14.5 }}>
                <Link to={'/library/' + answer.club_id + '#season-' + answer.season}>{title}</Link>
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <Button onClick={share}>{t('daily.share')}</Button>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>{t('daily.next')}</p>
            </Card>
          )}
        </div>
      </div>

      <Stats s={s} signedIn={!!user} />
    </Page>
  );
}

function Cell({ tone, children }: { tone: 'empty' | 'ok' | 'close' | 'bad'; children: React.ReactNode }) {
  const bg = { empty: 'var(--sunken)', ok: 'var(--accent-fill)', close: '#F5C84B', bad: '#3A3F3C' }[tone];
  const fg = tone === 'bad' ? '#FFFFFF' : tone === 'empty' ? 'var(--text)' : '#06110A';
  return (
    <div style={{ minHeight: 44, borderRadius: 12, background: bg, color: fg, border: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 14, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
      {children}
    </div>
  );
}

/** The puzzle picture; the library one if today's sharper copy is missing. */
function PuzzleImage({ kit }: { kit: DailyKit }) {
  const [src, setSrc] = useState(kit.image);
  return <img src={src} alt="" onError={() => setSrc(kit.library_image)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
}

/** One more fact after every wrong guess: the kit, then the league, then country (clubs) or decade (national teams). */
function Hints({ answer, shown }: { answer: DailyKit; shown: number }) {
  const { t } = usePrefs();
  const nation = answer.league === 'National Teams';
  const facts = [
    [t('daily.hint.kit'), t('lib.kind.' + answer.kind)],
    [t('daily.hint.league'), nation ? t('lib.nations') : answer.league],
    nation ? [t('daily.hint.decade'), t('daily.decade', { n: Math.floor(answer.season_year / 10) * 10 })] : [t('daily.hint.country'), answer.country]
  ] as const;
  if (shown < 1) return <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0' }}>{t('daily.hintsLater')}</p>;
  return (
    <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {facts.slice(0, shown).map(([k, v]) => (
        <li key={k} className="badge" style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, background: 'var(--sunken)', border: '1px solid var(--line)', color: 'var(--text)' }}>
          {k}: <strong style={{ marginLeft: 4 }}>{v}</strong>
        </li>
      ))}
    </ul>
  );
}

function Stats({ s, signedIn }: { s: ReturnType<typeof stats>; signedIn: boolean }) {
  const { t } = usePrefs();
  const most = Math.max(1, ...s.dist);
  const tiles: [string, number | string][] = [
    [t('daily.played'), s.played],
    [t('daily.winPct'), s.winPct + '%'],
    [t('daily.streak'), s.current],
    [t('daily.maxStreak'), s.max]
  ];
  return (
    <section aria-labelledby="daily-stats" style={{ marginTop: 32 }}>
      <h2 id="daily-stats" className="title">
        {t('daily.stats')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginTop: 12 }}>
        {tiles.map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '12px 10px', borderRadius: 14, textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>
              {v}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{k}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 6, marginTop: 14 }} aria-label={t('daily.dist')}>
        {s.dist.map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
            <span className="mono">{i + 1}</span>
            <div style={{ height: 20, width: `${Math.max(8, (c / most) * 100)}%`, background: c ? 'var(--accent-fill)' : 'var(--sunken)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 6px', color: '#06110A', fontWeight: 700 }}>
              {c}
            </div>
          </div>
        ))}
      </div>
      {!signedIn && (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
          <Link to="/signin">{t('daily.signIn')}</Link> {t('daily.signInWhy')}
        </p>
      )}
    </section>
  );
}
