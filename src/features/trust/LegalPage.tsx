// Imprint, terms, privacy and help pages. The content describes what the app
// actually does (escrow flow, fees from src/fees.ts, the processors it really
// calls). Company details come from config/company.ts.
import { LEGAL_LAST_UPDATED, LEGAL_REVIEWED } from '../../config/company.ts';
import { Link, Navigate, useParams } from 'react-router';
import { LEGAL_DOCS, type LegalDoc } from '../../config/legal.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { BUYER_AUTH_FEE_CHF, BUYER_SHIPPING_CHF, SELLER_FEE_RATE } from '../../fees.ts';
import { COMPANY } from '../../config/company.ts';
import { DOCS } from './legalContent.tsx';
import { Mail, P, UL } from './legalParts.tsx';

const TITLE = { help: 'footer.help', terms: 'footer.terms', privacy: 'footer.privacy', imprint: 'footer.imprint' } as const;

/** Help is everyday guidance, so it's translated; the legal texts wait for review. */
function HelpSections() {
  const { t, money } = usePrefs();
  const pct = Math.round(SELLER_FEE_RATE * 100) + '%';
  const sections = [
    ['help.buying', <UL key="b" items={[t('help.b1'), t('help.b2'), t('help.b3')]} />],
    ['help.selling', <UL key="s" items={[t('help.s1'), t('help.s2'), t('help.s3', { pct })]} />],
    ['help.fees', <P key="f">{t('help.feesBody', { auth: money(BUYER_AUTH_FEE_CHF), ship: money(BUYER_SHIPPING_CHF), pct })}</P>],
    [
      'help.contact',
      <P key="c">
        {t('help.orders')} <Mail to={COMPANY.supportEmail} />
        <br />
        {t('help.else')} <Mail to={COMPANY.email} />
      </P>
    ]
  ] as const;
  return (
    <>
      {sections.map(([h, body]) => (
        <section key={h} style={{ marginTop: 28 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700 }}>{t(h)}</h2>
          {body}
        </section>
      ))}
    </>
  );
}

const MONO = 'var(--font-mono)';

export default function LegalPage({ doc: fixed }: { doc?: LegalDoc }) {
  const params = useParams();
  const id = (fixed || params.doc) as LegalDoc;
  const doc = DOCS[id];
  const { t, lang } = usePrefs();
  usePageMeta(doc ? t(TITLE[id]) : null);
  if (!doc) return <Navigate to="/help" replace />;
  return (
    <main id="main" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(28px,4vw,56px) var(--gutter) 96px', display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,56px)', animation: 'kvIn .4s ease both' }}>
      <nav aria-label={t('legal.nav')} style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {LEGAL_DOCS.map((d) => {
          const on = d.id === id;
          return (
            <Link key={d.id} to={d.id === 'help' ? '/help' : '/legal/' + d.id} aria-current={on ? 'page' : undefined} className="nav-link" style={{ borderRadius: 10, padding: '10px 12px', fontWeight: 600 }}>
              {t(TITLE[d.id])}
            </Link>
          );
        })}
      </nav>
      <article style={{ flex: '1 1 520px', minWidth: 0, maxWidth: 720 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(34px,5vw,56px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 0.95 }}>{t(TITLE[id])}</h1>
        {id !== 'help' && <div style={{ fontFamily: MONO, fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>{t('legal.updated', { date: LEGAL_LAST_UPDATED })}</div>}
        {!LEGAL_REVIEWED && id !== 'help' && (
          <div role="note" className="notice notice--warn" style={{ marginTop: 16 }}>
            {t('legal.draft')}
          </div>
        )}
        {lang !== 'en' && id !== 'help' && (
          <div role="note" className="notice notice--info" style={{ marginTop: 12 }}>
            {t('legal.englishOnly')}
          </div>
        )}
        {doc.intro && <p style={{ margin: '20px 0 0', fontSize: 16, lineHeight: 1.6 }}>{doc.intro}</p>}
        {id === 'help' ? (
          <HelpSections />
        ) : (
          doc.sections.map((s) => (
            <section key={s.h} style={{ marginTop: 28 }}>
              <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700 }}>{s.h}</h2>
              {s.body}
            </section>
          ))
        )}
      </article>
    </main>
  );
}
