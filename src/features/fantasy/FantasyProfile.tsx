// The game on a collector's public profile: division, season points, best
// Gameweek, badges and the squad as it stood at the last deadline.
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { Skeleton } from '../../ui/index.ts';
import { JerseyCard } from './JerseyCard.tsx';
import { priceText } from './model.ts';

type Badge = { key: string; data: Record<string, unknown>; at: string };
type SquadEntry = { club_id: string; name: string; league: string; price: number; image_path: string | null };

export function FantasyProfile({ handle }: { handle: string }) {
  const { t } = usePrefs();
  const q = useQuery({ queryKey: ['fantasyProfile', handle.toLowerCase()], queryFn: () => db.loadFantasyProfile(handle), staleTime: 60_000, retry: false });
  if (q.isLoading) return <Skeleton height={200} radius={20} style={{ marginTop: 14 }} />;
  const p = q.data;
  if (!p || !p.plays) return <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 14 }}>{t('fantasy.profile.none', { handle })}</p>;
  const badges = (p.badges as unknown as Badge[]) ?? [];
  const squad = (p.squad as unknown as SquadEntry[]) ?? [];
  const badgeText = (b: Badge) => {
    const d = b.data as { matchday?: number; to?: number; division?: number; cup?: string; league?: string; season?: string };
    if (b.key.startsWith('motm:')) return t('fantasy.badge.motm', { n: d.matchday ?? '' });
    if (b.key.startsWith('manager-of-season:')) return t('fantasy.badge.season', { season: d.season ?? '' });
    if (b.key.startsWith('promoted:')) return t('fantasy.badge.promoted', { n: d.to ?? '' });
    if (b.key.startsWith('division-winner:')) return t('fantasy.badge.divisionWinner', { n: d.division ?? '', cup: d.cup ?? '' });
    if (b.key.startsWith('league-winner:')) return t('fantasy.badge.leagueWinner', { league: d.league ?? '', cup: d.cup ?? '' });
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
      {squad.length > 0 && (
        <section aria-label={t('fantasy.profile.squad')}>
          <h3 className="title" style={{ margin: '0 0 8px', fontSize: 15 }}>
            👕 {t('fantasy.profile.squad')} <span className="mono" style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 12.5 }}>{priceText(p.squad_value)}</span>
          </h3>
          <ul className="fantasy-squadgrid fantasy-squadgrid--slots" style={{ margin: 0 }}>
            {squad.map((c) => (
              <li key={c.club_id}>
                <JerseyCard j={c} small />
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
              <li key={b.key} className={'fantasy-badge' + (b.key.startsWith('motm') || b.key.startsWith('manager-of-season') ? ' is-gold' : '')}>
                {badgeText(b)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
