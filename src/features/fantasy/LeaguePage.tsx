// One league: the cup table (classic by points, head-to-head like a real
// league), this Matchday's pairings with live points, and the banter.
// Read-only for visitors; members post, share the code, leave.
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SITE_URL } from '../../config/site.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import type { League } from '../../utils/db.ts';
import { Button, ErrorState, Notice, Page, Segmented, Skeleton, useConfirm } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { StandingsTable } from './StandingsTable.tsx';

type Tab = 'table' | 'pairings' | 'chat';

export default function LeaguePage() {
  const { id = '' } = useParams();
  const { t } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const league = useQuery({ queryKey: ['fantasyLeague', id, user?.id], queryFn: () => db.loadLeague(id), staleTime: 30_000, retry: false });
  const l = league.data;
  usePageMeta((l?.name ?? t('fantasy.lg.title')) + ' · Fantasy');
  const tab = (params.get('tab') as Tab) || (l?.format === 'h2h' ? 'pairings' : 'table');
  const join = useMutation({
    mutationFn: () => db.joinLeague(l!.invite_code!),
    onSuccess: () => {
      toast(t('fantasy.lg.joined'));
      void qc.invalidateQueries({ queryKey: ['fantasyLeague', id] });
      void qc.invalidateQueries({ queryKey: ['fantasyLeagues'] });
    },
    onError: () => toast(t('fantasy.lg.err.failed'))
  });
  const leave = async () => {
    if (!(await confirm({ title: t('fantasy.lg.leave'), confirmLabel: t('fantasy.lg.leave') }))) return;
    await db.leaveLeague(id);
    void qc.invalidateQueries({ queryKey: ['fantasyLeagues'] });
    navigate('/fantasy/leagues');
  };
  const share = async () => {
    const url = `${SITE_URL}/fantasy/join/${l!.invite_code}`;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      navigator.share({ title: l!.name, text: 'Maillot Fantasy · ' + l!.name, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    toast(t('fantasy.lg.copied'));
  };

  return (
    <Page>
      <Link to="/fantasy/leagues" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← {t('fantasy.lg.title')}
      </Link>
      {league.isLoading && <Skeleton height={260} radius={24} />}
      {league.isError && <ErrorState what={t('fantasy.lg.title')} onRetry={() => league.refetch()} />}
      {league.data === null && <Notice tone="neg">{t('fantasy.lg.err.notFound')}</Notice>}
      {l && (
        <>
          <header className="fantasy-head">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {t('fantasy.lg.' + l.format)} · {t('fantasy.lg.members', { n: l.members })}
                {l.owner_handle && ' · ' + t('fantasy.lg.owner', { handle: l.owner_handle })}
              </p>
              <h1 className="display" style={{ margin: '4px 0 0', fontSize: 'clamp(28px,4vw,40px)' }}>
                {l.name}
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {l.is_member ? (
                <>
                  <Button size="sm" variant="secondary" onClick={share}>
                    {t('fantasy.lg.share')} · {l.invite_code}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={leave}>
                    {t('fantasy.lg.leave')}
                  </Button>
                </>
              ) : user ? (
                l.invite_code && (
                  <Button size="sm" onClick={() => join.mutate()} busy={join.isPending}>
                    {t('fantasy.lg.joinBtn')}
                  </Button>
                )
              ) : (
                <Link to="/signin" state={{ from: '/fantasy/league/' + id }} className="btn btn--primary btn--sm">
                  {t('fantasy.signin')}
                </Link>
              )}
            </div>
          </header>
          <div style={{ marginTop: 14 }}>
            <Segmented label={l.name} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} options={[{ value: 'table', label: t('fantasy.lg.tab.table') }, { value: 'pairings', label: t('fantasy.lg.tab.pairings') }, { value: 'chat', label: t('fantasy.lg.tab.chat') }]} />
          </div>
          {tab === 'table' && <LeagueTable l={l} />}
          {tab === 'pairings' && <Pairings l={l} />}
          {tab === 'chat' && <Chat l={l} />}
        </>
      )}
    </Page>
  );
}

function LeagueTable({ l }: { l: League }) {
  const { t } = usePrefs();
  const rows = useQuery({ queryKey: ['fantasyTable', 'league', l.id, l.cup_id], queryFn: () => db.loadTable('league', l.id, String(l.cup_id)), enabled: !!l.cup_id, staleTime: 30_000, retry: false });
  const members = useQuery({ queryKey: ['fantasyLeagueMembers', l.id], queryFn: () => db.loadLeagueMembers(l.id), staleTime: 60_000, retry: false });
  return (
    <section style={{ marginTop: 16 }}>
      <h2 className="title" style={{ margin: '0 0 8px', fontSize: 15 }}>
        {t('fantasy.lg.cupTable', { cup: l.cup_name ?? '' })}
      </h2>
      {rows.isLoading && <Skeleton height={200} radius={18} />}
      <StandingsTable rows={rows.data ?? []} h2h={l.format === 'h2h'} empty={t('fantasy.lg.tableEmpty')} />
      {/* Members without a standing yet. */}
      {members.data && members.data.filter((m) => !(rows.data ?? []).some((r) => r.user_id === m.user_id)).length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {members.data
            .filter((m) => !(rows.data ?? []).some((r) => r.user_id === m.user_id))
            .map((m) => (
              <li key={m.user_id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
                <Avatar avatar={m.avatar} name={m.handle} size={22} ring={false} /> @{m.handle}
              </li>
            ))}
        </ul>
      )}
      {(rows.data ?? []).some((r) => r.avg_filled > 0) && <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)' }}>{t('fantasy.lg.avgNote')}</p>}
    </section>
  );
}

function Pairings({ l }: { l: League }) {
  const { t } = usePrefs();
  const rows = useQuery({ queryKey: ['fantasyPairings', l.id, l.matchday_id], queryFn: () => db.loadPairings(l.id, l.matchday_id!), enabled: !!l.matchday_id, staleTime: 30_000, retry: false });
  if (l.format !== 'h2h')
    return (
      <section style={{ marginTop: 16 }}>
        <LiveRow l={l} />
      </section>
    );
  if (rows.isLoading) return <Skeleton height={200} radius={18} style={{ marginTop: 16 }} />;
  if (!rows.data?.length) return <Notice style={{ marginTop: 16 }}>{t('fantasy.lg.pairingsNone')}</Notice>;
  return (
    <ul className="fantasy-pairings">
      {rows.data.map((p) => (
        <li key={p.user_a} className={'fantasy-pairing' + (p.result ? ' is-' + p.result : '')}>
          <span className="fantasy-pairing__side">
            <Avatar avatar={p.avatar_a} name={p.handle_a} size={28} ring={false} />
            <Link to={'/u/' + p.handle_a}>@{p.handle_a}</Link>
          </span>
          <span className="fantasy-pairing__score mono">
            {p.points_a} : {p.points_b}
          </span>
          <span className="fantasy-pairing__side is-b">
            {p.handle_b ? (
              <>
                <Link to={'/u/' + p.handle_b}>@{p.handle_b}</Link>
                <Avatar avatar={p.avatar_b} name={p.handle_b} size={28} ring={false} />
              </>
            ) : (
              <em style={{ color: 'var(--muted)' }}>{t('fantasy.lg.average')}</em>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Classic leagues: this matchday's live points per member, from the cup table. */
function LiveRow({ l }: { l: League }) {
  const { t } = usePrefs();
  const rows = useQuery({ queryKey: ['fantasyTable', 'league', l.id, l.cup_id], queryFn: () => db.loadTable('league', l.id, String(l.cup_id)), enabled: !!l.cup_id, staleTime: 30_000, retry: false });
  const live = (rows.data ?? []).filter((r) => r.this_md !== null).sort((a, b) => (b.this_md ?? 0) - (a.this_md ?? 0));
  if (!live.length) return <Notice>{t('fantasy.lg.pairingsNone')}</Notice>;
  return (
    <ol className="fantasy-table" style={{ marginTop: 0 }}>
      {live.map((r, i) => (
        <li key={r.user_id} className={'fantasy-table__row' + (r.is_me ? ' is-me' : '')}>
          <span className="mono fantasy-table__rank">{i + 1}</span>
          <Avatar avatar={r.avatar} name={r.handle} size={28} ring={false} />
          <Link to={'/u/' + r.handle} style={{ flex: 1, fontWeight: 650 }}>
            @{r.handle}
          </Link>
          <b className="mono">{r.this_md}</b>
        </li>
      ))}
    </ol>
  );
}

function Chat({ l }: { l: League }) {
  const { t, lang } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const posts = useQuery({ queryKey: ['fantasyPosts', l.id], queryFn: () => db.loadLeaguePosts(l.id), staleTime: 15_000, retry: false, refetchInterval: 30_000 });
  const [body, setBody] = useState('');
  const post = useMutation({
    mutationFn: () => db.postInLeague(l.id, body.trim()),
    onSuccess: () => {
      setBody('');
      void qc.invalidateQueries({ queryKey: ['fantasyPosts', l.id] });
    },
    onError: () => toast(t('fantasy.lg.err.failed'))
  });
  const report = (id: number) =>
    db.reportLeaguePost(id).then(() => {
      toast(t('fantasy.lg.reported'));
      void qc.invalidateQueries({ queryKey: ['fantasyPosts', l.id] });
    });
  return (
    <section style={{ marginTop: 16 }}>
      {l.is_member && user && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) post.mutate();
          }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input value={body} onChange={(e) => setBody(e.target.value.slice(0, 500))} placeholder={t('fantasy.lg.post')} aria-label={t('fantasy.lg.post')} className="fantasy-chat__input" />
          <Button type="submit" size="sm" disabled={!body.trim()} busy={post.isPending}>
            {t('fantasy.lg.send')}
          </Button>
        </form>
      )}
      {posts.isLoading && <Skeleton height={160} radius={18} style={{ marginTop: 12 }} />}
      {posts.data && !posts.data.length && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>{t('fantasy.lg.chatEmpty')}</p>}
      <ul className="fantasy-chat">
        {(posts.data ?? []).map((p) => (
          <li key={p.id} className={'fantasy-chat__post' + (p.is_me ? ' is-me' : '')}>
            <Avatar avatar={p.avatar} name={p.handle} size={28} ring={false} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                <b style={{ color: 'var(--text)' }}>@{p.handle}</b> · {new Date(p.created_at).toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.body}</p>
            </div>
            {user && !p.is_me && (
              <button type="button" className="link-btn link-btn--muted" onClick={() => report(p.id)} style={{ fontSize: 11.5, flex: 'none' }}>
                {t('fantasy.lg.report')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
