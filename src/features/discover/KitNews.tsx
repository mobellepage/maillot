// Discover: the latest kit news as tall cards (9:16). Headlines, teasers and
// title pictures come from SoccerBible (used with permission) and say so.
// A card opens the news inside Maillot: in the iOS app the article itself in
// the in-app browser, on the web the news page (/news/:id). Where the news
// is about a kit in our library, the card links to it.
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import type { NewsItem } from '../../utils/db.ts';
import { isNative } from '../../lib/native.ts';
import { newsMonth, newsPicture, openArticle } from './news.ts';

export function KitNews({ except, title }: { except?: string; title?: string } = {}) {
  const { t } = usePrefs();
  const news = useQuery({ queryKey: ['kitNews'], queryFn: () => db.loadNews(6), staleTime: 30 * 60_000, retry: false });
  const list = (news.data ?? []).filter((n) => n.id !== except).slice(0, 5);
  if (!list.length) return null;
  return (
    <section aria-labelledby="news-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(24px,3vw,40px) var(--gutter) 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 14px' }}>
        <h2 id="news-title" className="title" style={{ margin: 0 }}>
          📰 {title ?? t('news.title')}
        </h2>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('news.source', { source: 'SoccerBible' })}</span>
      </div>
      <ul className="news-row">
        {list.map((n) => (
          <li key={n.id}>
            <NewsCard n={n} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewsCard({ n }: { n: NewsItem }) {
  const { t, lang } = usePrefs();
  const month = newsMonth(n.published_on, lang);
  return (
    <article className={n.image_path ? 'news-card news-card--photo' : n.kit_image ? 'news-card' : 'news-card news-card--text'}>
      {n.image_path ? (
        <img className="news-card-photo" src={newsPicture(n.image_path)} alt="" loading="lazy" decoding="async" />
      ) : (
        n.kit_image && (
          <div className="news-card-pic" aria-hidden="true">
            <img src={n.kit_image} alt="" loading="lazy" decoding="async" />
          </div>
        )
      )}
      <div className="news-card-top">
        <span className="news-card-source">{n.source}</span>
        <span>{month}</span>
      </div>
      <div className="news-card-body">
        {!n.image_path && !n.kit_image && (
          <span className="news-quote" aria-hidden="true">
            “
          </span>
        )}
        <h3>
          {isNative() ? (
            <button type="button" onClick={() => openArticle(n.url)} className="stretched-link news-card-open">
              {n.title}
            </button>
          ) : (
            <Link to={'/news/' + n.id} className="stretched-link">
              {n.title}
            </Link>
          )}
        </h3>
        <span className="news-card-read">{t('news.from', { source: n.source })}</span>
        {n.club_id && n.club_name && (
          <Link to={'/library/' + n.club_id + (n.kit_season ? '#' + encodeURIComponent('season-' + n.kit_season) : '')} className="news-card-kit">
            👕 {t('news.kit', { club: n.club_name })} ›
          </Link>
        )}
      </div>
    </article>
  );
}
