import { Link } from 'react-router';
import { usePrefs } from '../../lib/prefs.tsx';
import { SectionHeader, ShirtGraphic, alpha } from '../../ui/index.ts';
import { newest } from '../catalog/model.ts';

export function NewArrivals() {
  const { money, t } = usePrefs();
  return (
    <section aria-labelledby="new-title" style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(56px,7vw,100px) 0 0' }}>
      <div style={{ padding: '0 var(--gutter)' }}>
        <SectionHeader id="new-title" eyebrow={t('home.new.eyebrow')} title={t('home.new.title')} />
      </div>
      <ul style={{ listStyle: 'none', margin: 0, display: 'flex', gap: 14, overflowX: 'auto', padding: '0 var(--gutter) 12px', scrollSnapType: 'x mandatory' }}>
        {newest().map((s) => (
          <li key={s.id} style={{ flex: '0 0 clamp(220px,22vw,280px)', scrollSnapAlign: 'start' }}>
            <Link to={'/shirt/' + s.id} className="card card--interactive" style={{ display: 'block', padding: 0, borderRadius: 22, overflow: 'hidden', color: 'var(--text)' }}>
              <span style={{ position: 'relative', display: 'grid', placeItems: 'center', aspectRatio: '4/3.4', background: `radial-gradient(circle at 50% 50%,${alpha(s.glow, 0.34)} 0%,rgba(0,0,0,0) 60%),var(--sunken)` }}>
                <span className="mono" style={{ position: 'absolute', top: 12, left: 12, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                  ● Added {s.added}d ago
                </span>
                <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} style={{ width: '56%', filter: 'drop-shadow(0 18px 22px rgba(0,0,0,0.55))' }} />
              </span>
              <span style={{ display: 'block', padding: '14px 16px 16px' }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                <span className="mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{s.brand}</span>
                  <span style={{ fontWeight: 600 }}>{money(s.price)}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
