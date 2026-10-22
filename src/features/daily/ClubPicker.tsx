// A club field (daily puzzle, favourite team): type a few letters, pick from the
// clubs that match below (names and short names: "YB", "BVB", "Juve" …).
// Arrow keys and Enter work as in any combobox.
import { useId, useRef, useState } from 'react';
import { usePrefs } from '../../lib/prefs.tsx';
import { matchClubs } from '../library/clubMatch.ts';

export interface PickerClub {
  id: string;
  name: string;
  league: string;
  aliases: string[];
}

export function ClubPicker({ clubs, value, onChange, label, id = 'daily-club', placeholder }: { clubs: PickerClub[]; value: string; onChange: (id: string) => void; label: string; id?: string; placeholder?: string }) {
  const { t } = usePrefs();
  const listId = useId();
  const chosen = clubs.find((c) => c.id === value);
  const [text, setText] = useState(chosen?.name ?? '');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(0);
  const [active, setActive] = useState(0);
  // A parent reset (after a guess) empties the field again.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!value) setText('');
  }

  const hits = matchClubs(clubs, text);
  const shown = open && hits.length > 0 && chosen?.name !== text;

  const pick = (c: PickerClub) => {
    onChange(c.id);
    setText(c.name);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="field">
        <input
          id={id}
          value={text}
          onChange={(e) => {
            window.clearTimeout(blurTimer.current);
            setText(e.target.value);
            setActive(0);
            setOpen(true);
            if (value) onChange('');
          }}
          onFocus={() => {
            window.clearTimeout(blurTimer.current);
            setOpen(true);
          }}
          onBlur={() => {
            // Late enough for a click on a suggestion; cancelled if the field is used again.
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (!shown) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(hits.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              pick(hits[active]!);
            } else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder ?? t('daily.clubPlaceholder')}
          aria-label={label}
          role="combobox"
          aria-expanded={shown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={shown ? listId + '-' + active : undefined}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {shown && (
        <ul id={listId} role="listbox" aria-label={label} style={{ listStyle: 'none', margin: 0, padding: 6, position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 20, background: 'var(--elevated)', border: '1px solid var(--line)', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
          {hits.map((c, i) => (
            <li
              key={c.id}
              id={listId + '-' + i}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              onMouseEnter={() => setActive(i)}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: i === active ? 'var(--accent-soft)' : undefined, fontSize: 14.5 }}
            >
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{c.league === 'National Teams' ? t('lib.nations') : c.league}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
