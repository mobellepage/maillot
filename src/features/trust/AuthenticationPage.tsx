// "How authentication works" — the trust page every purchase links to.
// The process described here is Maillot's policy; the escrow part is
// enforced in code (see supabase/migrations/*security_hardening_v1.sql).

import { ButtonLink } from '../../ui/index.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { INSPECTION_CHECKLIST } from '../../config/inspection.ts';
import { BUYER_AUTH_FEE_CHF } from '../../fees.ts';

const ACC = 'var(--accent)';
const STEPS = [1, 2, 3, 4, 5].map((n) => ({ title: `auth.s${n}.t`, body: `auth.s${n}.b` }));
const FAQ = [1, 2, 3, 4].map((n) => ({ q: `auth.q${n}`, a: `auth.a${n}` }));

export default function AuthenticationPage() {
  const { t, money } = usePrefs();
  usePageMeta(t('auth.meta'), t('auth.metaDesc'));
  return (
    <main id="main" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(28px,4vw,56px) clamp(16px,4vw,40px) 96px', animation: 'kvIn .4s ease both' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACC }}>{t('auth.eyebrow')}</div>
      <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(38px,6vw,76px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 0.92 }}>
        {t('auth.title')}
      </h1>
      <p style={{ maxWidth: 620, margin: '20px 0 0', fontSize: 'clamp(16px,1.4vw,18px)', lineHeight: 1.55, color: 'var(--text-2)', textWrap: 'pretty' }}>
        {t('auth.lede')}
      </p>

      <ol style={{ listStyle: 'none', padding: 0, margin: 'clamp(32px,5vw,56px) 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: 12 }}>
        {STEPS.map((s, i) => (
          <li key={s.title} style={{ padding: 20, borderRadius: 20, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: ACC }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 10, lineHeight: 1.25 }}>{t(s.title)}</div>
            <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{t(s.body)}</p>
          </li>
        ))}
      </ol>

      <section style={{ marginTop: 'clamp(40px,6vw,72px)', display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,48px)' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px,3vw,36px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase', lineHeight: 1 }}>{t('auth.checklist')}</h2>
          <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
            {t('auth.checklistBody')}
          </p>
        </div>
        <ul style={{ flex: '2 1 480px', listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))', gap: 8 }}>
          {INSPECTION_CHECKLIST.v1.map((c) => (
            <li key={c} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--sunken)', fontSize: 14, lineHeight: 1.45 }}>
              <span aria-hidden="true" style={{ color: ACC, fontWeight: 700 }}>
                ✓
              </span>
              <span>{t(c)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        style={{
          marginTop: 'clamp(40px,6vw,72px)',
          padding: 'clamp(22px,3vw,36px)',
          borderRadius: 24,
          background: 'linear-gradient(160deg,rgba(75,255,139,0.12),rgba(75,255,139,0) 55%),var(--surface)',
          border: '1px solid rgba(75,255,139,0.3)'
        }}
      >
        <h2 style={{ margin: 0, fontSize: 'clamp(24px,2.8vw,32px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase' }}>{t('auth.guarantee')}</h2>
        <p style={{ maxWidth: 680, margin: '10px 0 0', fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)' }}>
          {t('auth.guaranteeBody')}
        </p>
      </section>

      <section style={{ marginTop: 'clamp(40px,6vw,72px)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(24px,2.8vw,32px)', fontWeight: 800, fontStretch: '78%', textTransform: 'uppercase' }}>{t('auth.questions')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQ.map((f) => (
            <details key={f.q} style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>{t(f.q)}</summary>
              <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{t(f.a, { fee: money(BUYER_AUTH_FEE_CHF) })}</p>
            </details>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 40 }}>
        <ButtonLink to="/market">{t('auth.browse')}</ButtonLink>
        <ButtonLink to="/sell" variant="secondary">
          {t('auth.sell')}
        </ButtonLink>
      </div>
    </main>
  );
}
