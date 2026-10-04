// Site-wide footer: navigation, trust links, legal pages and payment methods.
import { COMPANY } from '../config/company.ts';
import type { LegalDoc } from '../config/legal.ts';

const MONO = "'JetBrains Mono Variable','JetBrains Mono',monospace";

export interface FooterProps {
  v: {
    goBrowse: () => void;
    goSell: () => void;
    goAuthInfo: () => void;
    goLegal: (doc: LegalDoc) => void;
  };
}

function Col({ title, links }: { title: string; links: [string, () => void][] }) {
  return (
    <div style={{ minWidth: 140 }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6F7872', marginBottom: 12 }}>{title}</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map(([label, go]) => (
          <li key={label}>
            <button onClick={go} className="hov-link" style={{ padding: 0, border: 0, background: 'none', color: '#C9D0CB', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PAYMENT_METHODS = ['TWINT', 'Visa', 'Mastercard', 'Apple Pay'];

export default function Footer({ v }: FooterProps) {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 'clamp(48px,6vw,96px)', background: '#0A0C0B' }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '40px clamp(16px,4vw,40px) 32px', display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px,5vw,64px)' }}>
        <div style={{ flex: '1 1 260px', maxWidth: 340 }}>
          <div style={{ fontWeight: 800, fontStretch: '78%', fontSize: 20, letterSpacing: '0.03em' }}>MAILLOT</div>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: '#8C958F' }}>
            The market for football shirts. Every sale held in escrow and authenticated in Zürich.
          </p>
        </div>
        <Col
          title="Marketplace"
          links={[
            ['Browse shirts', v.goBrowse],
            ['Sell a shirt', v.goSell],
            ['How authentication works', v.goAuthInfo]
          ]}
        />
        <Col
          title="Support"
          links={[
            ['Help & contact', () => v.goLegal('help')],
            ['Imprint', () => v.goLegal('imprint')]
          ]}
        />
        <Col
          title="Legal"
          links={[
            ['Terms of use', () => v.goLegal('terms')],
            ['Privacy policy', () => v.goLegal('privacy')]
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
        <div style={{ fontFamily: MONO, fontSize: 12, color: '#6F7872' }}>
          © 2026 {COMPANY.name} · Zürich · No tracking cookies
        </div>
        <ul aria-label="Accepted payment methods" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PAYMENT_METHODS.map((m) => (
            <li key={m} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', color: '#C9D0CB' }}>
              {m}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
