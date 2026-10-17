// Discover: the latest kit news as tall cards (9:16). Headlines and links
// come from SoccerBible and say so; the article opens on their site. The
// picture is the kit from our library the news is about, with a link to it.
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import type { NewsItem } from '../../utils/db.ts';

export function KitNews() {
  const { t } = usePrefs();
  const news = useQuery({ queryKey: ['kitNews'], queryFn: () => db.loadNews(5), staleTime: 30 * 60_000, retry: false });
  if (!news.data?.length) return null;
  return (
    <section aria-labelledby="news-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(24px,3vw,40px) var(--gutter) 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 14px' }}>
        <h2 id="news-title" className="title" style={{ margin: 0 }}>
          📰 {t('news.title')}
        </h2>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('news.source', { source: 'SoccerBible' })}</span>
      </div>
      <ul className="news-row">
        {news.data.map((n) => (
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
  const month = new Date(n.published_on + 'T12:00:00Z').toLocaleDateString(lang === 'de' ? 'de-CH' : lang, { month: 'short', year: 'numeric' });
  return (
    <article className={n.kit_image ? 'news-card' : 'news-card news-card--text'}>
      {n.kit_image && (
        <div className="news-card-pic" aria-hidden="true">
          <img src={n.kit_image} alt="" loading="lazy" decoding="async" />
        </div>
      )}
      <div className="news-card-top">
        <span className="news-card-source">{n.source}</span>
        <span>{month}</span>
      </div>
      <div className="news-card-body">
        {!n.kit_image && (
          <span className="news-quote" aria-hidden="true">
            “
          </span>
        )}
        <h3>
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="stretched-link">
            {n.title}
          </a>
        </h3>
        <span className="news-card-read">
          {t('news.read', { source: n.source })} <span aria-hidden="true">↗</span>
        </span>
        {n.club_id && n.club_name && (
          <Link to={'/library/' + n.club_id + (n.kit_season ? '#' + encodeURIComponent('season-' + n.kit_season) : '')} className="news-card-kit">
            👕 {t('news.kit', { club: n.club_name })} ›
          </Link>
        )}
      </div>
    </article>
  );
}
