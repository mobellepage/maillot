// Albums: themed sets of kits to complete — a legend's clubs, a league's
// season, a World Cup. Each shows how far you are and how many are Gold.
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { albumText } from './model.ts';

export default function AlbumsPage() {
  const { t, lang } = usePrefs();
  const { user } = useSession();
  usePageMeta(t('fantasy.albums.title') + ' · Fantasy', t('fantasy.albums.body'));
  const albums = useQuery({ queryKey: ['fantasyAlbums', user?.id], queryFn: db.loadFantasyAlbums, staleTime: 60_000, retry: false });
  return (
    <Page>
      <Link to="/fantasy" className="btn btn--ghost btn--sm" style={{ marginBottom: 16 }}>
        ← Fantasy
      </Link>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: 0 }}>
        {t('fantasy.albums.title')}
      </h1>
      <p style={{ color: 'var(--text-2)', marginTop: 8, maxWidth: 620, lineHeight: 1.5 }}>{t('fantasy.albums.body')}</p>
      {albums.isLoading && <Skeleton height={320} radius={20} style={{ marginTop: 20 }} />}
      {albums.isError && <ErrorState what={t('fantasy.albums.title')} onRetry={() => albums.refetch()} />}
      {albums.data && (
        <ul className="fantasy-albums">
          {albums.data.map((a) => {
            const pct = a.total ? (a.have / a.total) * 100 : 0;
            return (
              <li key={a.id} className={'card fantasy-albumcard' + (a.done_gold ? ' is-gold' : a.done ? ' is-done' : '')}>
                <Link to={'/fantasy/album/' + a.slug} className="stretched-link" aria-label={albumText(a.title, lang)}>
                  <span className="fantasy-albumcard__cover">{a.cover && <img src={a.cover} alt="" loading="lazy" decoding="async" />}</span>
                </Link>
                <div style={{ minWidth: 0 }}>
                  <h2 className="fantasy-albumcard__title">{albumText(a.title, lang)}</h2>
                  <p className="fantasy-albumcard__sub">{albumText(a.description, lang)}</p>
                  <span className="fantasy-progress" aria-hidden="true">
                    <span style={{ width: `${pct}%`, background: a.done_gold ? '#f3c53d' : undefined }} />
                  </span>
                  <p className="fantasy-albumcard__meta">
                    {t('fantasy.albums.progress', { have: a.have, total: a.total, gold: a.gold })}
                    {a.done_gold ? ' · ' + t('fantasy.albums.goldDone') : a.done ? ' · ' + t('fantasy.albums.done') : ' · +' + a.reward_points + ' ' + t('fantasy.pointsLabel')}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
