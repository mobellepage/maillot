// The club field of the daily puzzle: type a few letters, pick from the
// clubs that match below (names and short names: "YB", "BVB", "Juve" …).
// Arrow keys and Enter work as in any combobox.
import { useId, useState } from 'react';
import { usePrefs } from '../../lib/prefs.tsx';

export interface PickerClub {
  id: string;
  name: string;
  league: string;
  aliases: string[];
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function ClubPicker({ clubs, value, onChange, label }: { clubs: PickerClub[]; value: string; onChange: (id: string) => void; label: string }) {
  const { t } = usePrefs();
  const listId = useId();
  const chosen = clubs.find((c) => c.id === value);
  const [text, setText] = useState(chosen?.name ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // A parent reset (after a guess) empties the field again.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!value) setText('');
  }

  const q = norm(text.trim());
  const hits = q
    ? clubs
        .map((c) => {
          const names = [c.name, ...c.aliases].map(norm);
          const rank = names.some((n) => n === q) ? 0 : names.some((n) => n.startsWith(q)) ? 1 : names.some((n) => n.split(/[\s.-]+/).some((w) => w.startsWith(q))) ? 2 : names.some((n) => n.includes(q)) ? 3 : 9;
          return { c, rank };
        })
        .filter((x) => x.rank < 9)
        .sort((a, b) => a.rank - b.rank || a.c.name.localeCompare(b.c.name))
        .slice(0, 8)
        .map((x) => x.c)
    : [];
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
          id="daily-club"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
            setOpen(true);
            if (value) onChange('');
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
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
          placeholder={t('daily.clubPlaceholder')}
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
