// One jersey of the game: a club's current kit with its name, league and
// price — marked when it plays this Gameweek, when it's the captain, when
// the manager owns its shirt (and so may captain it).
import { usePrefs } from '../../lib/prefs.tsx';
import { deltaText, priceText } from './model.ts';

export interface JerseyModel {
  club_id: string;
  name: string;
  league: string;
  price: number | string;
  delta?: number | string | null;
  image_path?: string | null;
  plays?: boolean;
  fixture?: string | null;
  owned?: boolean;
  starter?: boolean;
  captain?: boolean;
  is_national?: boolean;
}

export function JerseyCard({ j, small = false, dim = false }: { j: JerseyModel; small?: boolean; dim?: boolean }) {
  const { t } = usePrefs();
  const delta = deltaText(j.delta);
  return (
    <span className={'fantasy-jersey' + (small ? ' is-small' : '') + (dim ? ' is-dim' : '') + (j.captain ? ' is-captain' : '')}>
      <span className="fantasy-jersey__img">
        {j.image_path ? <img src={j.image_path} alt="" loading="lazy" /> : <span className="fantasy-jersey__none">?</span>}
        {j.captain && <span className="fantasy-jersey__cap" title={t('fantasy.md.captain')}>C</span>}
        {j.owned && <span className="fantasy-jersey__own" title={t('fantasy.sq.owned')}>👕</span>}
      </span>
      <span className="fantasy-jersey__name">{j.name}</span>
      <span className="fantasy-jersey__meta">
        <b className="mono">{priceText(j.price)}</b>
        {delta && <span className={'mono ' + (Number(j.delta) > 0 ? 'is-up' : 'is-down')}>{delta}</span>}
      </span>
      {!small && <span className={'fantasy-jersey__plays' + (j.plays ? ' is-on' : '')}>{j.plays ? (j.fixture ?? t('fantasy.md.plays')) : t('fantasy.md.noMatch')}</span>}
    </span>
  );
}
