// /news/:id — one kit news item inside Maillot: SoccerBible's title picture,
// headline and teaser (clearly credited), the full article one tap away (in
// the iOS app's in-app browser, on the web in a new tab), and the kit from
// our library it is about, ready to add to the collection.
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import * as db from '../../utils/db.ts';
import { Button, ButtonLink, EmptyState, ErrorState, Page, Skeleton } from '../../ui/index.ts';
import { AddKitDialog } from '../vault/AddKitDialog.tsx';
import { KitNews } from './KitNews.tsx';
import { newsMonth, newsPicture, openArticle } from './news.ts';

export default function NewsPage() {
  const { t, lang } = usePrefs();
  const { user } = useSession();
  const { pathname } = useLocation();
  const { id = '' } = useParams();
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const q = useQuery({ queryKey: ['newsItem', id], queryFn: () => db.loadNewsItem(id), enabled: valid });
  const n = q.data;
  usePageMeta(n ? n.title : t('news.title'), n?.excerpt ?? undefined);
  const kits = useQuery({ queryKey: ['clubKits', n?.club_id], queryFn: () => db.loadClubKits(n!.club_id!), enabled: !!n?.club_id && !!n.kit_id });
  const kit = kits.data?.find((k) => k.id === n?.kit_id);
  const [adding, setAdding] = useState(false);

  if (valid && q.isLoading)
    return (
      <Page narrow>
        <Skeleton height={420} radius={24} />
      </Page>
    );
  if (q.isError)
    return (
      <Page narrow>
        <ErrorState what={t('news.title')} onRetry={() => q.refetch()} />
      </Page>
    );
  if (!n)
    return (
      <Page narrow>
        <EmptyState title={t('news.notFound')} action={<ButtonLink to="/">{t('nav.discover')}</ButtonLink>} />
      </Page>
    );

  return (
    <>
      <Page narrow>
        <Link to="/" className="nav-link" style={{ display: 'inline-block', padding: '4px 0', fontSize: 14 }}>
          ← {t('nav.discover')}
        </Link>
        <article style={{ marginTop: 12 }}>
          {n.image_path && <img src={newsPicture(n.image_path)} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 24, display: 'block', background: 'var(--sunken)' }} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
            <span className="news-card-source">{n.source}</span>
            <span>{newsMonth(n.published_on, lang)}</span>
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(26px,4.4vw,40px)', margin: '12px 0 0', lineHeight: 1.12 }}>
            {n.title}
          </h1>
          {n.excerpt && <p style={{ fontSize: 16.5, lineHeight: 1.6, color: 'var(--text-2)', margin: '14px 0 0' }}>{n.excerpt}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 20 }}>
            <Button onClick={() => openArticle(n.url)}>
              {t('news.readFull', { source: n.source })} <span aria-hidden="true">↗</span>
            </Button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 0' }}>{t('news.credit', { source: n.source })}</p>
        </article>

        {n.club_id && n.club_name && (
          <section aria-labelledby="news-kit" className="card" style={{ marginTop: 28, padding: 16, borderRadius: 22, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {n.kit_image && (
              <span className="kit-thumb" style={{ width: 104, height: 104, borderRadius: 18, display: 'grid', placeItems: 'center', flex: 'none' }}>
                <img src={n.kit_image} alt="" style={{ width: '86%', height: '86%', objectFit: 'contain' }} />
              </span>
            )}
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div className="eyebrow">{t('news.inLibrary')}</div>
              <h2 id="news-kit" style={{ margin: '4px 0 0', fontSize: 17 }}>
                {n.club_name} {n.kit_season ?? ''}
              </h2>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                {kit &&
                  (user ? (
                    <Button size="sm" variant="secondary" onClick={() => setAdding(true)} style={{ color: 'var(--text)' }}>
                      + {t('lib.addToCollection')}
                    </Button>
                  ) : (
                    <ButtonLink size="sm" variant="secondary" to="/signin" state={{ from: pathname, notice: 'lib.signInToAdd' }} style={{ color: 'var(--text)' }}>
                      + {t('lib.addToCollection')}
                    </ButtonLink>
                  ))}
                <ButtonLink size="sm" variant="ghost" to={'/library/' + n.club_id + (n.kit_season ? '#' + encodeURIComponent('season-' + n.kit_season) : '')}>
                  {t('news.allKits', { club: n.club_name })} ›
                </ButtonLink>
              </div>
            </div>
          </section>
        )}
      </Page>
      <KitNews except={n.id} title={t('news.more')} />
      <div style={{ height: 48 }} />
      {adding && kit && n.club_name && <AddKitDialog kit={kit} clubName={n.club_name} onClose={() => setAdding(false)} />}
    </>
  );
}
