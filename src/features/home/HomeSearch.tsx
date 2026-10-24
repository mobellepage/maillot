// The first thing on the home page: "which shirt do you have, or want?".
// One field searches the marketplace (shirts with a market value) and the
// kit library (every kit, with its picture) at once — or, starting with @,
// collectors; Enter without a pick opens the market search, so results stay
// shareable.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Shirt } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import * as db from '../../utils/db.ts';
import { Button, SearchIcon, ShirtGraphic } from '../../ui/index.ts';
import { Avatar } from '../avatars/Avatar.tsx';
import { search } from '../catalog/model.ts';
import { variantLabel } from '../library/model.ts';
import { parseKitQuery } from './kitQuery.ts';
import { useBlocks } from '../moderation/useBlocks.ts';

/** Tapping one fills the field: shows at once what the search can do. */
const EXAMPLES = ['Milan 2006/07', 'YB 2018/19', 'Brazil 1970', 'Liverpool 2005', 'Napoli 1987/88'];

type Option = { kind: 'shirt'; to: string; shirt: Shirt } | { kind: 'kit'; to: string; kit: db.KitHit } | { kind: 'collector'; to: string; who: db.CollectorHit };

export function HomeSearch() {
  const { money, t, label } = usePrefs();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(0);
  // The library is asked once typing pauses.
  const [settled, setSettled] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSettled(q), 250);
    return () => clearTimeout(id);
  }, [q]);
  // "@name" looks for collectors instead of shirts.
  const person = settled.trim().startsWith('@') ? settled.trim().slice(1) : null;
  const kq = parseKitQuery(person === null ? settled : '');
  const blocks = useBlocks();
  const people = useQuery({
    queryKey: ['collectorSearch', person],
    queryFn: () => db.searchCollectors(person ?? ''),
    enabled: person !== null && person.length >= 1,
    staleTime: 60_000,
    retry: false,
    placeholderData: keepPreviousData
  });
  const kits = useQuery({
    queryKey: ['librarySearch', kq],
    queryFn: () => db.searchLibrary(kq),
    enabled: kq.club.length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
    placeholderData: keepPreviousData
  });

  const typingPerson = q.trim().startsWith('@');
  const shirts = q.trim() && !typingPerson ? search(q).slice(0, 4) : [];
  const kitHits = q.trim() && !typingPerson && kq.club.length >= 2 ? (kits.data ?? []).slice(0, 6) : [];
  const collectors = typingPerson && person !== null ? blocks.visible(people.data ?? [], (c) => c.handle).slice(0, 6) : [];
  const options: Option[] = [
    ...collectors.map((c): Option => ({ kind: 'collector', to: '/u/' + c.handle, who: c })),
    ...shirts.map((s): Option => ({ kind: 'shirt', to: '/shirt/' + s.id, shirt: s })),
    ...kitHits.map((k): Option => ({ kind: 'kit', to: '/library/' + k.club_id + '#season-' + k.season, kit: k }))
  ];
  const shown = open && options.length > 0;

  const pick = (text: string) => {
    setQ(text);
    setActive(-1);
    setOpen(true);
  };

  return (
    <div style={{ position: 'relative', margin: '0 auto', maxWidth: 680, textAlign: 'left' }}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && options[active]) navigate(options[active]!.to);
          // Which shirt do you have, or want: every shirt in a collection, not only the ones to buy.
          else navigate('/market' + (q.trim() ? '?q=' + encodeURIComponent(q.trim()) : ''));
        }}
      >
        <div className="hero-search" style={{ display: 'flex', alignItems: 'center', gap: 12, height: 64, padding: '0 6px 0 22px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--line)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', color: 'var(--muted)' }}>
          <SearchIcon size={20} />
          <input
            value={q}
            onChange={(e) => {
              window.clearTimeout(blurTimer.current);
              pick(e.target.value);
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
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(options.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(-1, i - 1));
              } else if (e.key === 'Escape') setOpen(false);
            }}
            placeholder={t('home.find.placeholder')}
            aria-label={t('home.searchLabel')}
            role="combobox"
            aria-expanded={shown}
            aria-controls="home-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={shown && active >= 0 ? 'hs-' + active : undefined}
            autoComplete="off"
            enterKeyHint="search"
            style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 17, color: 'var(--text)' }}
          />
          <Button type="submit" size="sm" style={{ height: 52, borderRadius: 999 }}>
            {t('home.search')}
          </Button>
        </div>
      </form>

      {shown && (
        <ul id="home-suggestions" role="listbox" aria-label={t('home.find.results')} style={{ listStyle: 'none', margin: 0, position: 'absolute', left: 0, right: 0, top: 72, zIndex: 20, background: 'var(--elevated)', border: '1px solid var(--line)', borderRadius: 22, padding: 6, boxShadow: '0 30px 80px rgba(0,0,0,0.25)', maxHeight: 'min(70vh,560px)', overflowY: 'auto', animation: 'kvIn .2s ease both' }}>
          {options.map((o, i) => {
            const first = i === 0 || options[i - 1]!.kind !== o.kind;
            return (
              <li key={o.to + i} id={'hs-' + i} role="option" aria-selected={i === active}>
                {first && (
                  <div aria-hidden="true" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', padding: '10px 12px 4px' }}>
                    {o.kind === 'shirt' ? t('home.find.market') : o.kind === 'kit' ? t('home.find.library') : t('home.find.collectors')}
                  </div>
                )}
                <Link to={o.to} className="row-btn" style={{ background: i === active ? 'var(--accent-soft)' : undefined }}>
                  {o.kind === 'shirt' ? (
                    <ShirtRowBody s={o.shirt} price={money(o.shirt.price)} sub={o.shirt.brand + ' · ' + label('league', o.shirt.league)} value={t('home.find.value')} />
                  ) : o.kind === 'kit' ? (
                    <KitRowBody k={o.kit} kindLabel={t('lib.kind.' + o.kit.kind)} variant={variantLabel(o.kit.variant, t)} cta={t('home.find.allKits')} />
                  ) : (
                    <>
                      <Avatar avatar={o.who.avatar} name={o.who.handle} size={40} ring={false} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={name}>@{o.who.handle}</span>
                        <span style={sub}>{t('home.find.shirtsCount', { n: o.who.shirts })}</span>
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('home.find.try')}</span>
        {EXAMPLES.map((x) => (
          <button key={x} type="button" className="chip" onClick={() => pick(x)}>
            {x}
          </button>
        ))}
      </div>
    </div>
  );
}

const thumb = { width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: 'var(--sunken)', display: 'grid', placeItems: 'center', flex: 'none' } as const;
const name = { display: 'block', fontSize: 14.5, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;
const sub = { display: 'block', fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

function ShirtRowBody({ s, price, sub: subText, value }: { s: Shirt; price: string; sub: string; value: string }) {
  return (
    <>
      <span style={thumb}>
        <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} flat style={{ width: '80%' }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={name}>{s.name}</span>
        <span style={sub}>{subText}</span>
      </span>
      <span style={{ textAlign: 'right', flex: 'none' }}>
        <span className="mono" style={{ display: 'block', fontSize: 14, fontWeight: 650 }}>
          {price}
        </span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>{value}</span>
      </span>
    </>
  );
}

function KitRowBody({ k, kindLabel, variant, cta }: { k: db.KitHit; kindLabel: string; variant: string; cta: string }) {
  return (
    <>
      <span style={thumb}>
        {k.image_path ? (
          <img src={k.image_path} alt="" loading="lazy" decoding="async" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
        ) : (
          <span aria-hidden="true" style={{ width: '70%', height: '70%', borderRadius: 8, background: `linear-gradient(135deg,${k.colors[0] ?? '#ccc'} 50%,${k.colors[1] ?? k.colors[0] ?? '#eee'} 50%)` }} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {/* The season leads the second line, so long club names never cut it off on a phone. */}
        <span style={name}>{k.club_name}</span>
        <span style={{ ...sub, color: 'var(--text-2)' }}>
          <strong style={{ fontWeight: 650, color: 'var(--text)' }}>{k.season}</strong> · {kindLabel}
          {variant && ' · ' + variant}
        </span>
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600, flex: 'none' }}>{cta} ›</span>
    </>
  );
}
