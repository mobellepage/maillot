// Leagues: the ones I'm in (with my rank this cup), create one, join with
// a code, and the public leagues anyone can join.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import * as db from '../../utils/db.ts';
import { Button, ErrorState, Page, Skeleton, TextField } from '../../ui/index.ts';

export default function LeaguesPage() {
  const { code: joinCode } = useParams();
  const { t } = usePrefs();
  const { user } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  usePageMeta(t('fantasy.lg.title') + ' · Fantasy', t('fantasy.lg.body'));
  const mine = useQuery({ queryKey: ['fantasyLeagues', user?.id], queryFn: db.loadMyLeagues, enabled: !!user, staleTime: 30_000, retry: false });
  const pub = useQuery({ queryKey: ['fantasyPublicLeagues'], queryFn: db.loadPublicLeagues, staleTime: 60_000, retry: false });
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'classic' | 'h2h'>('classic');
  const [isPublic, setIsPublic] = useState(false);
  const [code, setCode] = useState(joinCode ?? '');
  const fail = (e: unknown) => {
    const c = (e as { code?: string }).code;
    toast(c === 'P0481' ? t('fantasy.lg.err.notFound') : c === 'P0482' ? t('fantasy.lg.err.full') : t('fantasy.lg.err.failed'));
  };
  const create = useMutation({
    mutationFn: () => db.createLeague(name.trim(), format, isPublic),
    onSuccess: (id) => {
      toast(t('fantasy.lg.created'));
      void qc.invalidateQueries({ queryKey: ['fantasyLeagues'] });
      navigate('/fantasy/league/' + id);
    },
    onError: fail
  });
  const join = useMutation({
    mutationFn: (c: string) => db.joinLeague(c),
    onSuccess: (id) => {
      toast(t('fantasy.lg.joined'));
      void qc.invalidateQueries({ queryKey: ['fantasyLeagues'] });
      navigate('/fantasy/league/' + id);
    },
    onError: fail
  });

  return (
    <Page>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: 0 }}>
        {t('fantasy.lg.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', marginTop: 8, maxWidth: 640, lineHeight: 1.5 }}>{t('fantasy.lg.body')}</p>

      {user ? (
        <section aria-labelledby="my-leagues" style={{ marginTop: 22 }}>
          <h2 id="my-leagues" className="title" style={{ margin: '0 0 10px' }}>
            {t('fantasy.lg.mine')}
          </h2>
          {mine.isLoading && <Skeleton height={120} radius={18} />}
          {mine.isError && <ErrorState compact what={t('fantasy.lg.title')} onRetry={() => mine.refetch()} />}
          {mine.data && !mine.data.length && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{t('fantasy.lg.none')}</p>}
          <ul className="fantasy-leagues">
            {(mine.data ?? []).map((l) => (
              <li key={l.id} className="card fantasy-leaguecard">
                <Link to={'/fantasy/league/' + l.id} className="stretched-link" style={{ fontWeight: 800, fontSize: 16 }}>
                  {l.name}
                </Link>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  {t('fantasy.lg.' + l.format)} · {t('fantasy.lg.members', { n: l.members })}
                </span>
                <span className="fantasy-leaguecard__rank">
                  {l.rank ? <b>#{l.rank}</b> : <b>–</b>}
                  <small>{l.format === 'h2h' ? `${l.h2h_pts} pts` : `${l.points} pts`}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div style={{ marginTop: 22 }}>
          <Link to="/signin" state={{ from: joinCode ? '/fantasy/join/' + joinCode : '/fantasy/leagues' }} className="btn btn--primary">
            {t('fantasy.signin')}
          </Link>
        </div>
      )}

      {user && (
        <div className="fantasy-grid" style={{ marginTop: 18 }}>
          <section className="card fantasy-panel" aria-labelledby="join-title">
            <h2 id="join-title" className="title" style={{ margin: 0 }}>
              {t('fantasy.lg.join')}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) join.mutate(code.trim());
              }}
              style={{ display: 'grid', gap: 10, marginTop: 12 }}
            >
              <TextField label={t('fantasy.lg.code')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" autoCapitalize="characters" />
              <Button type="submit" disabled={code.trim().length < 6} busy={join.isPending}>
                {t('fantasy.lg.joinBtn')}
              </Button>
            </form>
          </section>
          <section className="card fantasy-panel" aria-labelledby="create-title">
            <h2 id="create-title" className="title" style={{ margin: 0 }}>
              {t('fantasy.lg.create')}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim().length >= 2) create.mutate();
              }}
              style={{ display: 'grid', gap: 10, marginTop: 12 }}
            >
              <TextField label={t('fantasy.lg.name')} value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} />
              <div role="group" aria-label={t('fantasy.lg.format')} style={{ display: 'flex', gap: 6 }}>
                {(['classic', 'h2h'] as const).map((f) => (
                  <button key={f} type="button" className="option-btn" aria-pressed={format === f} onClick={() => setFormat(f)} style={{ padding: '7px 13px', fontSize: 13 }}>
                    {t('fantasy.lg.' + f)}
                  </button>
                ))}
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> {t('fantasy.lg.public')}
              </label>
              <Button type="submit" disabled={name.trim().length < 2} busy={create.isPending}>
                {t('fantasy.lg.create')}
              </Button>
            </form>
          </section>
        </div>
      )}

      {pub.data && pub.data.length > 0 && (
        <section aria-labelledby="public-leagues" style={{ marginTop: 22 }}>
          <h2 id="public-leagues" className="title" style={{ margin: '0 0 10px' }}>
            {t('fantasy.lg.publicList')}
          </h2>
          <ul className="fantasy-leagues">
            {pub.data.map((l) => (
              <li key={l.id} className="card fantasy-leaguecard">
                <Link to={'/fantasy/league/' + l.id} className="stretched-link" style={{ fontWeight: 800, fontSize: 16 }}>
                  {l.name}
                </Link>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  {t('fantasy.lg.' + l.format)} · {t('fantasy.lg.members', { n: l.members })}
                  {l.owner_handle && ' · ' + t('fantasy.lg.owner', { handle: l.owner_handle })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
