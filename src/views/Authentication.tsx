// "How authentication works" — the trust page every purchase links to.
// The process described here is Maillot's policy; the escrow part is
// enforced in code (see supabase/migrations/*security_hardening_v1.sql).

const MONO = "'JetBrains Mono',monospace";
const ACC = '#4BFF8B';

export interface AuthenticationProps {
  v: {
    goBrowse: () => void;
    goSell: () => void;
  };
}

const STEPS: { title: string; body: string }[] = [
  {
    title: 'You pay — we hold it',
    body: 'Your payment goes into escrow the moment you check out. The seller sees that you paid, but receives nothing yet.'
  },
  {
    title: 'The seller ships to Zürich',
    body: 'Sellers get a prepaid, insured label to our authentication centre. Shirts never go straight from seller to buyer.'
  },
  {
    title: '14-point inspection',
    body: 'A specialist inspects the shirt against our reference archive for that exact season and edition (checklist below). Usually within 48 hours of arrival.'
  },
  {
    title: 'Tagged and shipped to you',
    body: 'Shirts that pass get a tamper-evident Maillot tag and are shipped to you, insured and tracked.'
  },
  {
    title: 'You confirm — the seller is paid',
    body: 'Only after you confirm the shirt arrived as described is the money released to the seller.'
  }
];

const CHECKS: string[] = [
  'Product code on the wash tag matches the season and edition',
  'Wash-tag print, font and layout',
  'Neck and jock tags: placement, stitching, materials',
  'Club crest: embroidery or heat-press method and density',
  'Manufacturer logo: application method and alignment',
  'Fabric weight and weave pattern for the edition',
  'Seams, hems and overlock stitching',
  'Sponsor print: material, finish and placement',
  'Name and number printing: font, material, era-correct supplier',
  'Sleeve and league patches: correct for the season and competition',
  'Colours against reference photos under calibrated light',
  'Condition matches the listing (wear, marks, fading, repairs)',
  'Match-worn: provenance documents and use marks consistent with the claim',
  'Signatures: certificate of authenticity checked with the issuer'
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What if the shirt fails?',
    a: 'You get a full refund, including fees. The shirt goes back to the seller and the failure is recorded against their account.'
  },
  {
    q: 'What if it arrives and isn’t as described?',
    a: 'Open a dispute from your Orders page before confirming receipt. Your money stays in escrow until our team resolves it.'
  },
  {
    q: 'What does authentication cost?',
    a: 'A flat CHF 9 per order, shown at checkout. Sellers pay nothing for authentication.'
  },
  {
    q: 'Can I see the shirt before I pay?',
    a: 'Every listing shows the seller’s photos and stated condition. Our inspection checks the shirt matches them before it ever reaches you.'
  }
];

export default function Authentication({ v }: AuthenticationProps) {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(28px,4vw,56px) clamp(16px,4vw,40px) 96px', animation: 'kvIn .4s ease both' }}>
      <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACC }}>Trust &amp; safety</div>
      <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(38px,6vw,76px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 0.92 }}>
        How authentication works
      </h1>
      <p style={{ maxWidth: 620, margin: '20px 0 0', fontSize: 'clamp(16px,1.4vw,18px)', lineHeight: 1.55, color: '#C9D0CB', textWrap: 'pretty' }}>
        Every shirt sold on Maillot passes through our Zürich authentication centre before it reaches the buyer. Your money is held in escrow the whole
        time, so you never pay for a fake.
      </p>

      <ol style={{ listStyle: 'none', padding: 0, margin: 'clamp(32px,5vw,56px) 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: 12 }}>
        {STEPS.map((s, i) => (
          <li key={s.title} style={{ padding: 20, borderRadius: 20, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: ACC }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 10, lineHeight: 1.25 }}>{s.title}</div>
            <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: '#C9D0CB' }}>{s.body}</p>
          </li>
        ))}
      </ol>

      <section style={{ marginTop: 'clamp(40px,6vw,72px)', display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,48px)' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px,3vw,36px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase', lineHeight: 1 }}>The 14-point checklist</h2>
          <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.55, color: '#C9D0CB' }}>
            Each point is checked against reference examples of the same season, edition and manufacturer. A shirt has to pass every point.
          </p>
        </div>
        <ul style={{ flex: '2 1 480px', listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))', gap: 8 }}>
          {CHECKS.map((c) => (
            <li key={c} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: '#0D100F', fontSize: 14, lineHeight: 1.45 }}>
              <span aria-hidden="true" style={{ color: ACC, fontWeight: 700 }}>
                ✓
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        style={{
          marginTop: 'clamp(40px,6vw,72px)',
          padding: 'clamp(22px,3vw,36px)',
          borderRadius: 24,
          background: 'linear-gradient(160deg,rgba(75,255,139,0.12),rgba(75,255,139,0) 55%),#101312',
          border: '1px solid rgba(75,255,139,0.3)'
        }}
      >
        <h2 style={{ margin: 0, fontSize: 'clamp(24px,2.8vw,32px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase' }}>The Maillot guarantee</h2>
        <p style={{ maxWidth: 680, margin: '10px 0 0', fontSize: 15, lineHeight: 1.6, color: '#C9D0CB' }}>
          If a shirt we authenticated turns out not to be genuine, we refund you in full — no time limit. That’s only possible because nothing is released to a seller
          until it has passed inspection and you’ve confirmed delivery.
        </p>
      </section>

      <section style={{ marginTop: 'clamp(40px,6vw,72px)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(24px,2.8vw,32px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase' }}>Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQ.map((f) => (
            <details key={f.q} style={{ padding: '16px 18px', borderRadius: 14, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>{f.q}</summary>
              <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: '#C9D0CB' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 40 }}>
        <button onClick={v.goBrowse} className="hov-primary" style={{ height: 52, padding: '0 24px', borderRadius: 14, border: 0, background: ACC, color: '#06110A', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Browse the market
        </button>
        <button onClick={v.goSell} className="hov-outline" style={{ height: 52, padding: '0 24px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.22)', background: 'none', color: '#F2F4F1', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Sell a shirt
        </button>
      </div>
    </main>
  );
}
