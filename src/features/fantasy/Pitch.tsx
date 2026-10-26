// The pitch: five jerseys on the grass, three on the bench below. An empty
// place is a "+" that opens the picker; a filled one shows the jersey and,
// on the pitch, the captain's "C". Shared by the squad and the Gameweek.
import { usePrefs } from '../../lib/prefs.tsx';
import { FANTASY } from '../../config/fantasy.ts';
import { JerseyCard, type JerseyModel } from './JerseyCard.tsx';

export interface PitchProps {
  /** Eight places: the first five on the pitch, the last three on the bench. */
  slots: (JerseyModel | null)[];
  /** Without it the pitch is only shown (another manager's line-up). */
  onTap?: (i: number) => void;
  /** When given, pitch jerseys get a captain button (disabled unless the shirt is owned). */
  onCaptain?: (i: number) => void;
  captainId?: string | null;
  /** The bench is greyed unless it scores (Bench Boost). */
  benchDim?: boolean;
  disabled?: boolean;
  /** While substituting: the pitch jersey going off, and the bench framed green to choose from. */
  outId?: string | null;
}

export function Pitch({ slots, onTap, onCaptain, captainId, benchDim = true, disabled = false, outId = null }: PitchProps) {
  const { t } = usePrefs();
  const rows = [[0, 1, 2], [3, 4]];
  const place = (i: number, bench: boolean) => {
    const j = slots[i] ?? null;
    if (!j)
      return (
        <li key={i} className="fantasy-pitch__slot">
          {onTap ? (
            <button type="button" className="fantasy-pitch__add" onClick={() => onTap(i)} disabled={disabled} aria-label={t('fantasy.sq.addSlot')}>
              +
            </button>
          ) : (
            <span className="fantasy-pitch__add" aria-hidden="true" />
          )}
        </li>
      );
    const isCap = !!captainId && captainId === j.club_id;
    const subbing = !!outId;
    return (
      <li key={j.club_id} className={'fantasy-pitch__slot' + (isCap ? ' is-captain' : '') + (subbing && bench ? ' is-pick' : '') + (outId === j.club_id ? ' is-out' : '')}>
        {onTap ? (
          <button type="button" className="fantasy-md__cardbtn" onClick={() => onTap(i)} disabled={disabled} aria-label={j.name}>
            <JerseyCard j={{ ...j, captain: isCap }} small dim={bench && benchDim && !subbing} />
          </button>
        ) : (
          <JerseyCard j={{ ...j, captain: isCap }} small dim={j.counts === undefined ? bench && benchDim : !j.counts} />
        )}
        {onCaptain && !bench && (
          <button type="button" className={'fantasy-md__cap' + (isCap ? ' is-on' : '')} aria-pressed={isCap} disabled={disabled || !j.owned} onClick={() => onCaptain(i)} title={j.owned ? t('fantasy.md.makeCaptain') : t('fantasy.md.captainOwnedOnly')}>
            C
          </button>
        )}
      </li>
    );
  };
  return (
    <div className="fantasy-pitch-wrap">
      <div className="fantasy-pitch" role="group" aria-label={t('fantasy.md.tab.lineup')}>
        {rows.map((r, k) => (
          <ul key={k} className="fantasy-pitch__row">
            {r.map((i) => place(i, false))}
          </ul>
        ))}
      </div>
      <div className={'fantasy-bench' + (outId ? ' is-pick' : '')}>
        <span className="fantasy-bench__label">{t('fantasy.md.bench')}</span>
        <ul className="fantasy-pitch__row fantasy-pitch__row--bench">{Array.from({ length: Math.max(FANTASY.squadSize - FANTASY.starters, slots.length - FANTASY.starters) }, (_, k) => place(FANTASY.starters + k, true))}</ul>
      </div>
    </div>
  );
}
