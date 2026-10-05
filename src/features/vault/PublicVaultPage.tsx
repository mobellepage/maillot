// Read-only public collection rendered purely from a share link's payload
// (#/vault/<base64 json>). The payload is attacker-controllable, so text is
// rendered as text (React escapes it) and every value that reaches CSS is
// checked against a strict allow-list — no url(), no expressions.
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../app/Header.tsx';
import { usePrefs } from '../../lib/prefs.tsx';
import { EmptyState, HEX, ShirtGraphic } from '../../ui/index.ts';

interface SharedItem {
  id: string;
  name: string;
  size?: string;
  priceFmt?: string;
  pat?: string;
  trim?: string;
  crest?: string;
  glowA?: string;
  badgeLabel?: string;
}
interface SharedVault {
  owner?: string;
  handle?: string;
  totalFmt?: string;
  items?: SharedItem[];
}

const SAFE_CSS = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|(?:repeating-)?linear-gradient\([\w\s#.,%()-]+\)|radial-gradient\([\w\s#.,%()-]+\))$/i;
const css = (v: unknown, fallback: string) => (typeof v === 'string' && v.length < 400 && SAFE_CSS.test(v) && !/url\s*\(/i.test(v) ? v : fallback);
const text = (v: unknown, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');

export default function PublicVaultPage({ data }: { data: unknown }) {
  const pv = data && typeof data === 'object' ? (data as SharedVault) : null;
  const items = Array.isArray(pv?.items) ? pv!.items!.slice(0, 200) : [];
  const { t } = usePrefs();
  const owner = text(pv?.owner, 60) || t('vault.aCollector');

  useEffect(() => {
    document.title = (pv ? t('pub.title', { owner }) : t('pub.invalid')) + ' · MAILLOT';
  }, [pv, owner, t]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--gutter)', height: 68, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo />
          <div style={{ flex: 1 }} />
          <Link to="/vault" className="btn btn--ghost btn--sm">
            {t('pub.startOwn')}
          </Link>
        </div>
      </header>
      {!pv ? (
        <main id="main" style={{ maxWidth: 600, margin: '0 auto', padding: '80px 20px' }}>
          <EmptyState title={t('pub.invalid')}>{t('pub.invalidBody')}</EmptyState>
        </main>
      ) : (
        <main id="main" className="page page--narrow">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
            <div aria-hidden="true" style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid var(--accent)', padding: 4, flex: 'none' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--avatar-grad)', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>{owner.slice(0, 2).toUpperCase()}</div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 className="display" style={{ fontSize: 'clamp(26px,3.4vw,36px)', lineHeight: 1.05 }}>
                {owner}
              </h1>
              <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>{text(pv.handle, 60) ? text(pv.handle, 60) + ' · ' : ''}{t('pub.readOnly')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {t('vault.value')}
              </div>
              <div className="mono" style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>
                {text(pv.totalFmt, 30)}
              </div>
            </div>
          </div>
          <ul className="grid-cards" style={{ listStyle: 'none', padding: 0, margin: '32px 0 0', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,200px),1fr))' }}>
            {items.map((s, i) => (
              <li key={text(s.id, 60) || i} className="card" style={{ padding: 0, borderRadius: 22, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1/1.08', display: 'grid', placeItems: 'center', position: 'relative', background: `radial-gradient(circle at 50% 46%,${css(s.glowA, 'rgba(140,149,143,0.3)')},rgba(0,0,0,0) 62%),var(--sunken)` }}>
                  <span className="mono" style={{ position: 'absolute', top: 12, left: 12, fontSize: 10.5, color: 'var(--text-2)' }}>
                    SIZE {text(s.size, 10)}
                  </span>
                  {s.badgeLabel && (
                    <span className="badge badge--neutral" style={{ position: 'absolute', top: 12, right: 12, fontSize: 9.5 }}>
                      {text(s.badgeLabel, 30)}
                    </span>
                  )}
                  <ShirtGraphic pat={css(s.pat, HEX.placeholderFill)} trim={css(s.trim, 'var(--muted)')} crest={css(s.crest, 'var(--muted)')} style={{ width: '66%' }} />
                </div>
                <div style={{ padding: '14px 16px 16px' }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, height: '2.5em', overflow: 'hidden' }}>{text(s.name)}</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 10 }}>
                    {text(s.priceFmt, 30)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </main>
      )}
    </div>
  );
}
