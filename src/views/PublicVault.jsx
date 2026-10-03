import ShirtGraphic from '../components/ShirtGraphic.jsx';

const MONO = "'JetBrains Mono',monospace";

// Read-only page rendered from a decoded share-link payload (see utils/share.js) —
// no buy/sell/watch/admin actions, no dependency on this visitor's own localStorage.
export default function PublicVault({ v }) {
  const pv = v.publicVault;

  return (
    <div>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)', height: 68, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={pv ? pv.goHome : v.goHome} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#4BFF8B', display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 10, height: 10, border: '2.5px solid #0A0C0B', borderRadius: 2, transform: 'rotate(45deg)' }} />
            </div>
            <span style={{ fontWeight: 800, fontStretch: '78%', fontSize: 20, letterSpacing: '0.03em', color: '#F2F4F1' }}>MAILLOT</span>
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={pv ? pv.goHome : v.goHome}
            style={{ height: 38, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Eigenen Vault erstellen →
          </button>
        </div>
      </header>

      {!pv ? (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Link ungültig oder abgelaufen</h1>
          <p style={{ color: '#8C958F', marginTop: 10, lineHeight: 1.6 }}>Dieser Vault-Link konnte nicht gelesen werden. Bitte prüfe, ob du die vollständige URL kopiert hast.</p>
        </main>
      ) : (
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px) 80px', animation: 'kvIn .4s ease both' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #4BFF8B', padding: 4, flex: 'none' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg,#2B3A31,#151A17)', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>
                {pv.owner.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,36px)', fontWeight: 800, fontStretch: '76%', textTransform: 'uppercase', lineHeight: 1.05 }}>{pv.owner}</h1>
              <div style={{ fontSize: 13.5, color: '#8C958F', marginTop: 6 }}>{pv.handle} · Öffentliche Sammlung · Nur-Lesen-Ansicht</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C958F' }}>Portfoliowert</div>
              <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, marginTop: 2 }}>{pv.totalFmt}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,200px),1fr))', gap: 'clamp(10px,1.4vw,18px)', marginTop: 32 }}>
            {pv.items.map((s) => (
              <div key={s.id} style={{ borderRadius: 22, overflow: 'hidden', background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                  style={{
                    aspectRatio: '1/1.08',
                    display: 'grid',
                    placeItems: 'center',
                    position: 'relative',
                    background: `radial-gradient(circle at 50% 46%,${s.glowA},rgba(0,0,0,0) 62%),#0D100F`
                  }}
                >
                  <span style={{ position: 'absolute', top: 12, left: 12, fontFamily: MONO, fontSize: 10.5, color: '#C9D0CB' }}>SIZE {s.size}</span>
                  {s.isCustom && (
                    <span
                      style={{
                        position: 'absolute', top: 12, right: 12, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, padding: '4px 8px', borderRadius: 999,
                        color: s.badgeColor, background: s.badgeBg, border: `1px solid ${s.badgeColor}55`
                      }}
                    >
                      {s.badgeLabel}
                    </span>
                  )}
                  <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} style={{ width: '66%' }} />
                </div>
                <div style={{ padding: '14px 16px 16px' }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, height: '2.5em', overflow: 'hidden' }}>{s.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, marginTop: 10 }}>{s.priceFmt}</div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
