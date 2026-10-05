// Imprint, terms, privacy and help pages. The content describes what the app
// actually does (escrow flow, fees from src/fees.ts, the processors it really
// calls). Company details come from config/company.ts.
import { LEGAL_LAST_UPDATED, LEGAL_REVIEWED } from '../../config/company.ts';
import { Link, Navigate, useParams } from 'react-router';
import { LEGAL_DOCS, type LegalDoc } from '../../config/legal.ts';
import { usePageMeta } from '../../lib/meta.ts';
import { DOCS } from './legalContent.tsx';

const MONO = 'var(--font-mono)';

export default function LegalPage({ doc: fixed }: { doc?: LegalDoc }) {
  const params = useParams();
  const id = (fixed || params.doc) as LegalDoc;
  const doc = DOCS[id];
  usePageMeta(doc ? doc.title : null);
  if (!doc) return <Navigate to="/help" replace />;
  return (
    <main id="main" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(28px,4vw,56px) var(--gutter) 96px', display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,56px)', animation: 'kvIn .4s ease both' }}>
      <nav aria-label="Legal and help" style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {LEGAL_DOCS.map((d) => {
          const on = d.id === id;
          return (
            <Link key={d.id} to={d.id === 'help' ? '/help' : '/legal/' + d.id} aria-current={on ? 'page' : undefined} className="nav-link" style={{ borderRadius: 10, padding: '10px 12px', fontWeight: 600 }}>
              {d.label}
            </Link>
          );
        })}
      </nav>
      <article style={{ flex: '1 1 520px', minWidth: 0, maxWidth: 720 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(34px,5vw,56px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 0.95 }}>{doc.title}</h1>
        {id !== 'help' && <div style={{ fontFamily: MONO, fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>Last updated {LEGAL_LAST_UPDATED}</div>}
        {!LEGAL_REVIEWED && id !== 'help' && (
          <div role="note" className="notice notice--warn" style={{ marginTop: 16 }}>
            Draft — pending legal review. Details in [brackets] will be completed before launch.
          </div>
        )}
        {doc.intro && <p style={{ margin: '20px 0 0', fontSize: 16, lineHeight: 1.6 }}>{doc.intro}</p>}
        {doc.sections.map((s) => (
          <section key={s.h} style={{ marginTop: 28 }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700 }}>{s.h}</h2>
            {s.body}
          </section>
        ))}
      </article>
    </main>
  );
}
