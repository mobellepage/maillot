// The search field in the header: clubs and collectors show up while typing
// (a club opens its kits in the library, a collector their profile); Enter
// searches the market. On the market page the field filters as you type.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePrefs } from '../lib/prefs.tsx';
import * as db from '../utils/db.ts';
import { SearchIcon } from '../ui/index.ts';
import { Avatar } from '../features/avatars/Avatar.tsx';
import { matchClubs } from '../features/library/clubMatch.ts';

type Option = { kind: 'club'; to: string; title: string; sub: string; colors: string[] } | { kind: 'collector'; to: string; who: db.CollectorHit } | { kind: 'market'; to: string };

export function HeaderSearch() {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const onMarket = pathname.startsWith('/market');
  const [q, setQ] = useState(onMarket ? params.get('q') || '' : '');
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef(0);
  const [settled, setSettled] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSettled(q.trim()), 200);
    return () => clearTimeout(id);
  }, [q]);
  // Leaving the market empties the field; coming back shows its search.
  const [lastPath, setLastPath] = useState(onMarket);
  if (onMarket !== lastPath) {
    setLastPath(onMarket);
    setQ(onMarket ? params.get('q') || '' : '');
  }

  // The club list once the field is used (cached with the library's).
  const clubs = useQuery({ queryKey: ['kitClubs'], queryFn: db.loadKitClubs, staleTime: 10 * 60_000, enabled: used });
  const person = settled.replace(/^@/, '');
  const people = useQuery({
    queryKey: ['collectorSearch', person],
    queryFn: () => db.searchCollectors(person),
    enabled: used && person.length >= 2,
    staleTime: 60_000,
    retry: false,
    placeholderData: keepPreviousData
  });

  const text = q.trim();
  const byHandle = text.startsWith('@');
  const options: Option[] = text
    ? [
        ...(byHandle ? [] : matchClubs(clubs.data ?? [], text, 6)).map((c): Option => ({ kind: 'club', to: '/library/' + c.id, title: c.name, sub: c.league || c.country, colors: c.colors ?? [] })),
        ...(person.length >= 2 ? (people.data ?? []).slice(0, byHandle ? 6 : 3) : []).map((who): Option => ({ kind: 'collector', to: '/u/' + who.handle, who })),
        ...(byHandle ? [] : [{ kind: 'market', to: '/market?q=' + encodeURIComponent(text) } as Option])
      ]
    : [];
  const shown = open && options.length > 0;

  const go = (to: string) => {
    setOpen(false);
    setActive(-1);
    if (!to.startsWith('/market')) setQ('');
    navigate(to);
  };

  return (
    <div className="hide-narrow" style={{ position: 'relative', flex: 'none' }}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && options[active]) go(options[active]!.to);
          else go('/market' + (text ? '?q=' + encodeURIComponent(text) : ''));
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 999, background: 'var(--elevated)', border: '1px solid var(--line)', width: 'min(280px,26vw)', color: 'var(--muted)' }}
      >
        <SearchIcon size={15} />
        <input
          name="q"
          type="search"
          value={q}
          aria-label={t('header.search')}
          placeholder={t('header.search')}
          role="combobox"
          aria-expanded={shown}
          aria-controls="header-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={shown && active >= 0 ? 'hd-' + active : undefined}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => {
            window.clearTimeout(blurTimer.current);
            setQ(e.target.value);
            setActive(-1);
            setOpen(true);
            if (onMarket) navigate('/market?q=' + encodeURIComponent(e.target.value), { replace: true });
          }}
          onFocus={() => {
            window.clearTimeout(blurTimer.current);
            setUsed(true);
            setOpen(true);
          }}
          onBlur={() => {
            // Late enough for a click on a suggestion; cancelled if the field is used again.
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(options.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(-1, i - 1));
            } else if (e.key === 'Escape') setOpen(false);
          }}
          style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 13.5, color: 'var(--text)' }}
        />
      </form>
      {shown && (
        <ul id="header-suggestions" role="listbox" aria-label={t('header.search')} className="header-suggest">
          {options.map((o, i) => {
            const first = o.kind !== 'market' && (i === 0 || options[i - 1]!.kind !== o.kind);
            return (
              <li key={o.to} id={'hd-' + i} role="option" aria-selected={i === active}>
                {first && <div className="header-suggest__head">{o.kind === 'club' ? t('header.suggest.clubs') : t('header.suggest.collectors')}</div>}
                <Link
                  to={o.to}
                  className="row-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    go(o.to);
                  }}
                  style={{ background: i === active ? 'var(--accent-soft)' : undefined, padding: '8px 10px', gap: 10 }}
                >
                  {o.kind === 'club' ? (
                    <>
                      <span aria-hidden="true" className="header-suggest__dot" style={{ background: `linear-gradient(135deg, ${o.colors[0] ?? 'var(--line)'} 50%, ${o.colors[1] ?? o.colors[0] ?? 'var(--line)'} 50%)` }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="header-suggest__name">{o.title}</span>
                        <span className="header-suggest__sub">{o.sub}</span>
                      </span>
                    </>
                  ) : o.kind === 'collector' ? (
                    <>
                      <Avatar avatar={o.who.avatar} name={o.who.handle} size={28} ring={false} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="header-suggest__name">@{o.who.handle}</span>
                        <span className="header-suggest__sub">{t('home.find.shirtsCount', { n: o.who.shirts })}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <SearchIcon size={15} style={{ color: 'var(--muted)', flex: 'none', marginLeft: 6 }} />
                      <span className="header-suggest__sub" style={{ color: 'var(--text-2)' }}>
                        {t('header.suggest.all', { q: text })}
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
