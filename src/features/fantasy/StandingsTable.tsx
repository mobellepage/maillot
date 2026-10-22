// A standings table (league, division, cup, season): rank, player, points —
// and W/D/L for head-to-head leagues. Zones mark promotion and relegation.
import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import type { StandingRow } from '../../utils/db.ts';
import { Avatar } from '../avatars/Avatar.tsx';

export function StandingsTable({ rows, h2h = false, empty, promote = 0, relegate = 0 }: { rows: StandingRow[]; h2h?: boolean; empty: string; promote?: number; relegate?: number }) {
  const { t } = usePrefs();
  if (!rows.length) return <p style={{ color: 'var(--muted)', fontSize: 14 }}>{empty}</p>;
  return (
    <ol className="fantasy-table" style={{ marginTop: 0 }}>
      {rows.map((r) => (
        <li key={r.user_id} className={'fantasy-table__row' + (r.is_me ? ' is-me' : '') + (r.rank === 1 ? ' is-top' : '') + (promote && r.rank <= promote ? ' is-up' : '') + (relegate && r.rank > rows.length - relegate ? ' is-down' : '')}>
          <span className="mono fantasy-table__rank">{r.rank}</span>
          <Avatar avatar={r.avatar} name={r.handle} size={28} ring={false} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <Link to={'/u/' + r.handle} style={{ fontWeight: 650 }}>
              @{r.handle}
            </Link>
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>
              {h2h ? `${r.wins}${t('fantasy.lg.W')} ${r.draws}${t('fantasy.lg.D')} ${r.losses}${t('fantasy.lg.L')} · ${r.points} pts` : `${r.played} MD`}
              {r.avg_filled > 0 && ` · ${r.avg_filled} ${t('fantasy.lg.avg')}`}
              {r.this_md !== null && ` · live ${r.this_md}`}
            </span>
          </span>
          <b className="mono" style={{ fontSize: 16 }}>
            {h2h ? r.h2h_pts : r.points}
          </b>
        </li>
      ))}
    </ol>
  );
}
