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

export function Logo() {
  const { t } = usePrefs();
  return (
    <Link to="/" aria-label={t('header.home')} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', color: 'var(--text)' }}>
      <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
        <span style={{ width: 10, height: 10, border: '2.5px solid var(--bg)', borderRadius: 2, transform: 'rotate(45deg)' }} />
      </span>
      <span style={{ fontWeight: 800, fontStretch: '78%', fontSize: 22, letterSpacing: '0.03em' }}>MAILLOT</span>
    </Link>
  );
}

const pillSelect = { height: 40, padding: '0 8px', borderRadius: 999, background: 'var(--elevated)', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12.5, cursor: 'pointer', flex: 'none' } as const;

export default function Header() {
  const { t, currency, setCurrency, currencies, lang, setLang, langs } = usePrefs();
  const { user, signOut } = useSession();
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
            <Link to="/account" title={user.email} aria-label={t('header.account')} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--accent)', background: 'var(--avatar-grad)', color: 'var(--text)', fontWeight: 700, fontSize: 13, display: 'grid', placeItems: 'center', flex: 'none' }}>
              {(user.email || '?').slice(0, 2).toUpperCase()}
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
