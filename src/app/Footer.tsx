// Site-wide footer: navigation, trust links, legal pages and payment methods.
import { Link } from 'react-router';
import { COMPANY } from '../config/company.ts';

const MONO = "'JetBrains Mono Variable','JetBrains Mono',monospace";

function Col({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div style={{ minWidth: 140 }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 12 }}>{title}</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="nav-link" style={{ padding: 0, color: 'var(--text-2)', fontSize: 14 }}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PAYMENT_METHODS = ['TWINT', 'Visa', 'Mastercard', 'Apple Pay'];

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 'clamp(48px,6vw,96px)', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '40px clamp(16px,4vw,40px) 32px', display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px,5vw,64px)' }}>
        <div style={{ flex: '1 1 260px', maxWidth: 340 }}>
          <div style={{ fontWeight: 800, fontStretch: '78%', fontSize: 20, letterSpacing: '0.03em' }}>MAILLOT</div>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--muted)' }}>
            The market for football shirts. Every sale held in escrow and authenticated in Zürich.
          </p>
        </div>
        <Col
          title="Marketplace"
          links={[
            ['Browse shirts', '/market'],
            ['Sell a shirt', '/sell'],
            ['How authentication works', '/authentication'],
            ['Verify a certificate', '/verify']
          ]}
        />
        <Col
          title="Support"
          links={[
            ['Help & contact', '/help'],
            ['Imprint', '/legal/imprint']
          ]}
        />
        <Col
          title="Legal"
          links={[
            ['Terms of use', '/legal/terms'],
            ['Privacy policy', '/legal/privacy']
          ]}
        />
      </div>
      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          padding: '20px clamp(16px,4vw,40px) 28px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 12, color: 'var(--faint)' }}>
          © 2026 {COMPANY.name} · Zürich · No tracking cookies
        </div>
        <ul aria-label="Accepted payment methods" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PAYMENT_METHODS.map((m) => (
            <li key={m} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-2)' }}>
              {m}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
