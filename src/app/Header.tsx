import { lazy, Suspense } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router';
import { HeartIcon, SearchIcon } from '../ui/index.ts';
import { usePrefs } from '../lib/prefs.tsx';
import { useSession } from '../lib/session.tsx';
import { useToast } from '../lib/toast.tsx';
import { useWatchlist } from '../features/watchlist/useWatchlist.ts';
import type { Currency } from '../utils/currency.ts';
import type { Lang } from '../i18n/index.ts';
// Signed-in only, so it isn't part of the first download for visitors.
const NotificationBell = lazy(() => import('./NotificationBell.tsx'));
import { useNavItems } from './nav.ts';
import { focusMain } from './focusMain.ts';
import { Avatar } from '../features/avatars/Avatar.tsx';

// The mark: a shirt outline (24×24). scripts/brand-assets.mjs draws the
// same path for the favicon and app icons.
const JERSEY = 'M8.8 3L12 6.6L15.2 3L20.6 5.3L22.8 10.4L19.2 11.8L18.2 9.8V20.2Q18.2 21 17.4 21H6.6Q5.8 21 5.8 20.2V9.8L4.8 11.8L1.2 10.4L3.4 5.3Z';

export function Logo() {
  const { t } = usePrefs();
  return (
    <Link to="/" aria-label={t('header.home')} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', color: 'var(--text)' }}>
      <span aria-hidden="true" className="logo-mark" style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-fill)', display: 'grid', placeItems: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ color: 'var(--bg)' }}>
          <path d={JERSEY} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="logo-word" style={{ fontWeight: 800, fontStretch: '78%', fontSize: 22, letterSpacing: '0.03em' }}>MAILLOT</span>
    </Link>
  );
}

const pillSelect = { height: 40, padding: '0 8px', borderRadius: 999, background: 'var(--elevated)', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12.5, cursor: 'pointer', flex: 'none' } as const;

export default function Header() {
  const { t, currency, setCurrency, currencies, lang, setLang, langs } = usePrefs();
  const { user, profile, signOut } = useSession();
  const watch = useWatchlist();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const items = useNavItems();
  const onMarket = pathname.startsWith('/market');

  return (
    <header className="app-header" style={{ position: 'sticky', top: 0, zIndex: 60, background: 'rgba(10,12,11,0.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: '1px solid var(--line)' }}>
      <a href="#main" className="skip-link" onClick={(e) => focusMain() && e.preventDefault()}>
        {t('a11y.skip')}
      </a>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 var(--gutter)', height: 68, display: 'flex', alignItems: 'center', gap: 'clamp(12px,2vw,28px)' }}>
        <Logo />
        <nav aria-label={t('header.mainNav')} className="hide-mobile" style={{ display: 'flex', gap: 2 }}>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className="nav-link" aria-current={n.match?.(pathname) || pathname === n.to ? 'page' : undefined}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <form
          role="search"
          className="hide-narrow"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get('q') || '');
            navigate('/market' + (q ? '?q=' + encodeURIComponent(q) : ''));
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 999, background: 'var(--elevated)', border: '1px solid var(--line)', width: 'min(280px,26vw)', color: 'var(--muted)' }}
        >
          <SearchIcon size={15} />
          <input
            key={onMarket ? 'market' : 'other'}
            name="q"
            type="search"
            aria-label={t('header.search')}
            defaultValue={onMarket ? params.get('q') || '' : ''}
            placeholder={t('header.search')}
            onChange={(e) => onMarket && navigate('/market?q=' + encodeURIComponent(e.target.value), { replace: true })}
            style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: 13.5, color: 'var(--text)' }}
          />
        </form>
        <select className="hide-mobile" aria-label={t('header.currency')} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={pillSelect}>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="hide-mobile" aria-label={t('header.language')} value={lang} onChange={(e) => setLang(e.target.value as Lang)} style={{ ...pillSelect, textTransform: 'uppercase' }}>
          {langs.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
        <Link to="/watchlist" aria-label={t('header.watchlist', { n: watch.ids.length })} className="icon-btn" style={{ width: 'auto', padding: '0 12px', borderRadius: 999, gap: 6, display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)' }}>
          <HeartIcon size={15} filled style={{ color: 'var(--accent)' }} />
          {watch.ids.length}
        </Link>
        {user ? (
          <>
            <Suspense fallback={<span style={{ width: 40 }} />}>
              <NotificationBell />
            </Suspense>
            <Link to="/account" title={user.email} aria-label={t('header.account')} style={{ display: 'grid', flex: 'none', color: 'var(--text)' }}>
              <Avatar avatar={profile?.avatar} name={profile?.handle || user.email || '?'} size={40} />
            </Link>
            <button
              type="button"
              className="link-btn link-btn--muted hide-mobile"
              style={{ fontSize: 12.5, flex: 'none' }}
              onClick={async () => {
                await signOut();
                toast(t('toast.signedOut'));
                navigate('/');
              }}
            >
              {t('header.signout')}
            </button>
          </>
        ) : (
          <Link to="/signin" className="btn btn--primary btn--sm" style={{ borderRadius: 999, flex: 'none' }}>
            {t('header.signin')}
          </Link>
        )}
      </div>
    </header>
  );
}
