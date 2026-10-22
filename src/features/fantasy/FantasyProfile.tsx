// The game on a collector's public profile: division, season points, best
// Matchday, badges, completed albums (Gold ones first) and a showcase of
// their Gold cards.
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { Skeleton } from '../../ui/index.ts';
import { GameCard, type GameCardModel } from './GameCard.tsx';
import { albumText } from './model.ts';

type Badge = { key: string; data: Record<string, unknown>; at: string };

export function FantasyProfile({ handle }: { handle: string }) {
  const { t, lang } = usePrefs();
  const q = useQuery({ queryKey: ['fantasyProfile', handle.toLowerCase()], queryFn: () => db.loadFantasyProfile(handle), staleTime: 60_000, retry: false });
  if (q.isLoading) return <Skeleton height={200} radius={20} style={{ marginTop: 14 }} />;
  const p = q.data;
  if (!p || !p.plays) return <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 14 }}>{t('fantasy.profile.none', { handle })}</p>;
  const badges = (p.badges as unknown as Badge[]) ?? [];
  const albums = (p.albums as unknown as { slug: string; title: unknown; gold: boolean }[]) ?? [];
  const gold = (p.gold as unknown as GameCardModel[]) ?? [];
  const badgeText = (b: Badge) => {
    const d = b.data as { matchday?: number; to?: number; division?: number; cup?: string; league?: string; album?: string };
    if (b.key.startsWith('motm:')) return t('fantasy.badge.motm', { n: d.matchday ?? '' });
    if (b.key.startsWith('promoted:')) return t('fantasy.badge.promoted', { n: d.to ?? '' });
    if (b.key.startsWith('division-winner:')) return t('fantasy.badge.divisionWinner', { n: d.division ?? '', cup: d.cup ?? '' });
    if (b.key.startsWith('league-winner:')) return t('fantasy.badge.leagueWinner', { league: d.league ?? '', cup: d.cup ?? '' });
    if (b.key.startsWith('gold-album:')) return t('fantasy.badge.goldAlbum', { album: d.album ?? '' });
    if (b.key.startsWith('album:')) return t('fantasy.badge.album', { album: d.album ?? '' });
    return b.key;
  };
  return (
    <div style={{ marginTop: 14, display: 'grid', gap: 16 }}>
      <div className="fantasy-stats">
        <span className="fantasy-stat">
          <b>{p.division_number ? t('fantasy.profile.division', { n: p.division_number }) : '–'}</b>
          <small>{t('fantasy.profile.played', { n: p.played })}</small>
        </span>
        <span className="fantasy-stat">
          <b>{p.season_points}</b>
          <small>{p.season_rank ? t('fantasy.profile.season', { points: p.season_points, rank: p.season_rank }) : t('fantasy.pointsLabel')}</small>
        </span>
        {p.best_points !== null && (
          <span className="fantasy-stat">
            <b>{p.best_points}</b>
            <small>{t('fantasy.profile.best', { points: p.best_points, n: p.best_matchday ?? '' })}</small>
          </span>
        )}
      </div>
      {gold.length > 0 && (
        <section aria-label={t('fantasy.profile.gold')}>
          <h3 className="title" style={{ margin: '0 0 8px', fontSize: 15 }}>
            ✨ {t('fantasy.profile.gold')}
          </h3>
          <ul className="fantasy-cardrow no-scrollbar" style={{ margin: 0 }}>
            {gold.map((c) => (
              <li key={c.kit_id}>
                <Link to={'/u/' + handle + '/' + encodeURIComponent((c as { item_id?: string }).item_id ?? '')} style={{ display: 'block' }}>
                  <GameCard c={{ ...c, gold: true }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {badges.length > 0 && (
        <section aria-label={t('fantasy.profile.badges')}>
          <h3 className="title" style={{ margin: '0 0 8px', fontSize: 15 }}>
            {t('fantasy.profile.badges')}
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {badges.slice(0, 24).map((b) => (
              <li key={b.key} className={'fantasy-badge' + (b.key.startsWith('gold-album') || b.key.startsWith('motm') ? ' is-gold' : '')}>
                {badgeText(b)}
              </li>
            ))}
          </ul>
        </section>
      )}
      {albums.length > 0 && (
        <section aria-label={t('fantasy.profile.albums')}>
          <h3 className="title" style={{ margin: '0 0 8px', fontSize: 15 }}>
            {t('fantasy.profile.albums')}
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {albums.map((a) => (
              <li key={a.slug} className={'fantasy-badge' + (a.gold ? ' is-gold' : '')}>
                <Link to={'/fantasy/album/' + a.slug}>
                  {a.gold ? '✨ ' : '📒 '}
                  {albumText(a.title, lang)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
