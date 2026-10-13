import { useState, type CSSProperties, type PointerEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { BY, pct, type Shirt } from '../../data.ts';
import type { MessageKey } from '../../i18n/index.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { StoreBadges } from '../../app/StoreBadges.tsx';
import { Button, ButtonLink, SearchIcon, ShirtGraphic, alpha } from '../../ui/index.ts';
import { search } from '../catalog/model.ts';
import { HeroStats } from './HeroStats.tsx';
import { useCollection } from '../vault/useCollection.ts';

const QUICK: { label: MessageKey; to: string }[] = [
  { label: 'home.quick.retro', to: '/market?type=Retro' },
  { label: 'home.quick.matchWorn', to: '/market?type=Match-worn' },
  { label: 'home.quick.wc', to: '/market?q=2026&league=National+Teams' },
  { label: 'home.quick.ssl', to: '/market?league=Swiss+Super+League' },
  { label: 'home.quick.under', to: '/market?max=120' }
];

export function Hero({ featured }: { featured: Shirt }) {
  const { money, t, label } = usePrefs();
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
          'radial-gradient(ellipse 55% 55% at 12% -18%,rgba(225,255,236,0.11),rgba(0,0,0,0) 70%),radial-gradient(ellipse 45% 50% at 92% -12%,rgba(225,255,236,0.09),rgba(0,0,0,0) 70%),radial-gradient(ellipse 80% 50% at 70% 110%,rgba(74,255,139,0.08),rgba(0,0,0,0) 70%)'
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(48px,8vw,104px) var(--gutter) clamp(40px,6vw,80px)', textAlign: 'center' }}>
        <h1 id="hero-title" className="display display--xl" style={{ fontWeight: 800, fontSize: 'clamp(44px,7vw,92px)', margin: '0 auto', maxWidth: 900, textWrap: 'balance' }}>
          {t('home.h1a')}
          <br />
          <span className="hero-accent" style={{ color: 'var(--accent)' }}>
            {t('home.h1b')}
          </span>
        </h1>
        <p className="lede" style={{ margin: '18px auto 0', maxWidth: 560, fontSize: 'clamp(18px,2vw,23px)', textWrap: 'balance' }}>
          {t('home.lede')}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 28 }}>
          <ButtonLink to="/vault/add" size="lg">
            {t('home.cta.start')}
          </ButtonLink>
          <ButtonLink to="/vault" size="lg" variant="secondary">
            {t('home.cta.mine')}
          </ButtonLink>
        </div>
        <div style={{ marginTop: 18 }}>
          <StoreBadges />
        </div>

        <HeroCards featured={featured} />

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (active >= 0 && sug[active]) navigate('/shirt/' + sug[active]!.id);
            else go();
          }}
          style={{ position: 'relative', margin: '0 auto', maxWidth: 640, textAlign: 'left' }}
        >
          <div className="hero-search" style={{ display: 'flex', alignItems: 'center', gap: 12, height: 60, padding: '0 6px 0 22px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', color: 'var(--muted)' }}>
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
              placeholder={t('home.searchPlaceholder')}
              aria-label={t('home.searchLabel')}
              role="combobox"
              aria-expanded={sug.length > 0}
              aria-controls="hero-suggestions"
              aria-activedescendant={active >= 0 ? 'sug-' + active : undefined}
              autoComplete="off"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 17, color: 'var(--text)' }}
            />
            <Button type="submit" size="sm" style={{ height: 48, borderRadius: 999 }}>
              {t('home.search')}
            </Button>
          </div>
          {sug.length > 0 && (
            <ul id="hero-suggestions" role="listbox" style={{ listStyle: 'none', margin: 0, position: 'absolute', left: 0, right: 0, top: 68, zIndex: 20, background: 'var(--elevated)', border: '1px solid var(--line)', borderRadius: 20, padding: 6, boxShadow: '0 30px 80px rgba(0,0,0,0.3)', animation: 'kvIn .2s ease both' }}>
              {sug.map((s, i) => (
                <li key={s.id} id={'sug-' + i} role="option" aria-selected={i === active}>
                  <Link to={'/shirt/' + s.id} className="row-btn" style={{ background: i === active ? 'var(--accent-soft)' : undefined }}>
                    <span style={{ width: 40, height: 40, borderRadius: 9, overflow: 'hidden', background: 'var(--sunken)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                      <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} flat style={{ width: '80%' }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                        {s.brand} · {label('league', s.league)}
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

        <nav aria-label={t('home.quickNav')} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {QUICK.map((c) => (
            <Link key={c.label} to={c.to} className="chip">
              {t(c.label, { price: money(120) })}
            </Link>
          ))}
        </nav>
        <HeroStats />
      </div>
    </section>
  );
}

// Studio-photo shirts fanned out like a collector's cards; the shirt of the
// week sits in the middle. Each card lifts and tilts towards the cursor.
const FAN = ['ned-88', 'juv-9697', 'acm-0607', 'ger-26', 'sui-26', 'ars-91', 'nap-8788'];

function HeroCards({ featured }: { featured: Shirt }) {
  const { money, t } = usePrefs();
  // "In your collection" only for shirts the signed-in member actually owns.
  const { items } = useCollection();
  const mine = new Set(items.map((c) => c.catalogId).filter(Boolean));
  const ids = FAN.includes(featured.id) ? FAN.filter((id) => id !== featured.id) : FAN.slice(0, 6);
  const mid = Math.floor(ids.length / 2);
  const cards = [...ids.slice(0, mid), featured.id, ...ids.slice(mid)].map((id) => BY[id]).filter((s): s is Shirt => !!s);
  const center = cards.indexOf(featured);

  const tilt = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.5) * 16 + 'deg');
    e.currentTarget.style.setProperty('--ty', (0.5 - (e.clientY - r.top) / r.height) * 16 + 'deg');
  };
  const untilt = (e: PointerEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.removeProperty('--tx');
    e.currentTarget.style.removeProperty('--ty');
  };

  return (
    <ul className="hero-fan" aria-label={t('home.cards')}>
      {cards.map((s, i) => {
        const off = i - center;
        const vars = { '--r': off * 5 + 'deg', '--y': Math.abs(off) * 16 + 'px', '--sx': off * 14 + 'px', '--z': 10 - Math.abs(off), '--i': i } as CSSProperties;
        const isFeatured = s === featured;
        return (
          <li key={s.id} className="hero-card-slot" data-far={Math.abs(off) > 1 || undefined} data-edge={Math.abs(off) > 2 || undefined} style={vars}>
            <Link
              to={'/shirt/' + s.id}
              className="hero-card"
              aria-label={isFeatured ? t('home.shirtOfWeekLabel', { name: s.name }) : s.name}
              onPointerMove={tilt}
              onPointerLeave={untilt}
            >
              <span className="hero-card-photo" style={{ position: 'relative', display: 'block', borderRadius: 16, overflow: 'hidden', background: `radial-gradient(circle at 50% 45%,${alpha(s.glow, 0.28)} 0%,rgba(0,0,0,0) 62%),var(--surface-2)` }}>
                <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} photo={s.photo} />
                {(isFeatured || mine.has(s.id)) && (
                  <span className={isFeatured ? 'badge badge--solid' : 'badge badge--neutral'} style={{ position: 'absolute', top: 8, left: 8, fontSize: 10.5, maxWidth: 'calc(100% - 16px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isFeatured ? t('home.shirtOfWeek') : '✓ ' + t('home.cardTag')}
                  </span>
                )}
              </span>
              <span style={{ display: 'block', padding: '10px 4px 4px', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 650, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 3, fontSize: 12, color: 'var(--muted)' }}>
                  {isFeatured ? <span style={{ color: 'var(--pos)', fontWeight: 600 }}>{pct(s.ch)}</span> : <span>{s.season}</span>}
                  <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {money(s.price)}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
