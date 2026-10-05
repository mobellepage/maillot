import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { SHIRTS, pct, type Shirt } from '../../data.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { Button, SearchIcon, ShirtGraphic, alpha } from '../../ui/index.ts';
import { search } from '../catalog/model.ts';
import { HeroStats } from './HeroStats.tsx';

const QUICK: { label: string; to: string }[] = [
  { label: 'Retro classics', to: '/market?type=Retro' },
  { label: 'Match-worn', to: '/market?type=Match-worn' },
  { label: 'World Cup 2026', to: '/market?q=2026&league=National+Teams' },
  { label: 'Swiss Super League', to: '/market?league=Swiss+Super+League' },
  { label: 'Under CHF 120', to: '/market?max=120' }
];

export function Hero({ featured }: { featured: Shirt }) {
  const { money } = usePrefs();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1);
  const sug = q.trim() ? search(q).slice(0, 5) : [];
  const go = () => navigate('/market' + (q.trim() ? '?q=' + encodeURIComponent(q.trim()) : ''));

  return (
    <section
      aria-labelledby="hero-title"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 55% 55% at 12% -18%,rgba(225,255,236,0.11),rgba(0,0,0,0) 70%),radial-gradient(ellipse 45% 50% at 92% -12%,rgba(225,255,236,0.09),rgba(0,0,0,0) 70%),radial-gradient(ellipse 80% 50% at 70% 110%,rgba(75,255,139,0.08),rgba(0,0,0,0) 70%)'
      }}
    >
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(36px,7vw,96px) var(--gutter) clamp(40px,6vw,80px)', display: 'flex', flexWrap: 'wrap', gap: 'clamp(32px,5vw,64px)', alignItems: 'center' }}>
        <div style={{ flex: '1 1 520px', minWidth: 0 }}>
          <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)', animation: 'kvPulse 1.8s ease-in-out infinite' }} />
            Live price index · {SHIRTS.length} shirts catalogued
          </div>
          <h1 id="hero-title" className="display display--xl" style={{ marginTop: 22, fontWeight: 800 }}>
            Every shirt.
            <br />
            Every season.
            <br />
            <span style={{ color: 'var(--accent)' }}>One market.</span>
          </h1>
          <p className="lede" style={{ margin: '24px 0 0', maxWidth: 520 }}>
            The catalogue, marketplace and price index for football shirts — new releases, retro classics and match-worn grails. Every sale authenticated in Zürich.
          </p>

          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (active >= 0 && sug[active]) navigate('/shirt/' + sug[active]!.id);
              else go();
            }}
            style={{ position: 'relative', marginTop: 32, maxWidth: 620 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 64, padding: '0 8px 0 22px', borderRadius: 18, background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', color: 'var(--muted)' }}>
              <SearchIcon size={20} />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(-1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActive((i) => Math.min(sug.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive((i) => Math.max(-1, i - 1));
                  } else if (e.key === 'Escape') setQ('');
                }}
                placeholder="Search any shirt…"
                aria-label="Search any shirt"
                role="combobox"
                aria-expanded={sug.length > 0}
                aria-controls="hero-suggestions"
                aria-activedescendant={active >= 0 ? 'sug-' + active : undefined}
                autoComplete="off"
                style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 17, color: 'var(--text)' }}
              />
              <Button type="submit" size="sm" style={{ height: 48 }}>
                Search
              </Button>
            </div>
            {sug.length > 0 && (
              <ul id="hero-suggestions" role="listbox" style={{ listStyle: 'none', margin: 0, position: 'absolute', left: 0, right: 0, top: 72, zIndex: 20, background: 'var(--elevated)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 6, boxShadow: '0 30px 80px rgba(0,0,0,0.6)', animation: 'kvIn .2s ease both' }}>
                {sug.map((s, i) => (
                  <li key={s.id} id={'sug-' + i} role="option" aria-selected={i === active}>
                    <Link to={'/shirt/' + s.id} className="row-btn" style={{ background: i === active ? 'rgba(255,255,255,0.05)' : undefined }}>
                      <span style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--sunken)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                        <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} flat style={{ width: '80%' }} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                          {s.brand} · {s.league}
                        </span>
                      </span>
                      <span className="mono" style={{ fontSize: 13 }}>
                        {money(s.price)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </form>

          <nav aria-label="Quick searches" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {QUICK.map((c) => (
              <Link key={c.label} to={c.to} className="chip">
                {c.label}
              </Link>
            ))}
          </nav>
          <HeroStats />
        </div>

        <div style={{ flex: '1 1 400px', minWidth: 0 }}>
          <Link
            to={'/shirt/' + featured.id}
            className="card card--interactive"
            aria-label={'Shirt of the week: ' + featured.name}
            style={{ position: 'relative', display: 'grid', placeItems: 'center', aspectRatio: '1/1.02', borderRadius: 32, padding: 0, overflow: 'hidden', color: 'var(--text)', background: `radial-gradient(circle at 50% 42%,${alpha(featured.glow, 0.34)} 0%,rgba(0,0,0,0) 58%),linear-gradient(180deg,var(--surface-2),var(--bg-deep))` }}
          >
            <span style={{ position: 'absolute', top: 22, left: 22, right: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
                Shirt of the week
              </span>
              <span className="badge badge--solid" style={{ fontSize: 12 }}>
                {pct(featured.ch)} · 30D
              </span>
            </span>
            <ShirtGraphic hero pat={featured.pat} trim={featured.trim} crest={featured.crest} style={{ width: '66%', transform: 'translateY(-4%)', filter: 'drop-shadow(0 40px 40px rgba(0,0,0,0.6))' }} />
            <span style={{ position: 'absolute', left: 18, right: 18, bottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 18px', borderRadius: 20, background: 'rgba(14,17,16,0.78)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 16, lineHeight: 1.25 }}>{featured.name}</span>
                <span className="mono" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {featured.brand} · {featured.edition}
                </span>
              </span>
              <span style={{ textAlign: 'right', flex: 'none' }}>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>Market value</span>
                <span className="mono" style={{ display: 'block', fontSize: 20, fontWeight: 700 }}>
                  {money(featured.price)}
                </span>
              </span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
