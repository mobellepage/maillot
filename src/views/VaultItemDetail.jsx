import { useState } from 'react';
import ShirtGraphic from '../components/ShirtGraphic.jsx';
import { downloadVaultCard } from '../utils/cardExport.js';

const MONO = "'JetBrains Mono',monospace";
const ACC = '#4BFF8B';

export default function VaultItemDetail({ v }) {
  const it = v.vaultItem;
  const [photoIdx, setPhotoIdx] = useState(0);
  if (!it) return null;
  const photo = it.photos[photoIdx];

  const rows = [
    ['Version', it.version || '\u2014'],
    ['Grösse', it.sizeGroup + ' ' + it.size + ' \u00b7 ' + it.sleeve],
    ['Flock', it.flockLine],
    ['Patches', it.patchesLine],
    ['Signatur', it.signatureLine],
    ['Anhänger (BNWT)', it.tagsLine],
    ['Zustand', it.conditionLine],
    ['Provenienz', it.provenance],
    ['Sichtbarkeit', it.visibilityLabel],
    ['Hinzugefügt', it.createdLabel]
  ];

  const exportCard = () =>
    downloadVaultCard({
      name: it.name,
      size: it.sizeGroup + ' ' + it.size,
      priceFmt: it.valuation && !it.valuation.blocked ? v.money(it.valuation.mid) : '\u2014',
      paid: 'Schätzwert',
      gain: '',
      gainC: '#8C958F',
      glowA: it.glowA,
      trim: it.trim,
      crest: it.crest,
      pat: it.pat,
      badgeLabel: it.badgeLabel,
      badgeColor: it.badgeColor
    });

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px) 80px', animation: 'kvIn .4s ease both' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={it.back} style={{ height: 44, padding: '0 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, cursor: 'pointer' }}>
          ← Zurück zum Vault
        </button>
        <button onClick={exportCard} style={{ height: 44, padding: '0 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, cursor: 'pointer' }}>
          Als Bild exportieren
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <div
            style={{
              position: 'relative',
              aspectRatio: '1/1',
              borderRadius: 24,
              overflow: 'hidden',
              background: photo ? `url(${photo.url}) center/cover` : `radial-gradient(circle at 50% 45%,${it.glowA},rgba(0,0,0,0) 62%),#0D100F`,
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            {!photo && <ShirtGraphic pat={it.pat} trim={it.trim} crest={it.crest} hero style={{ width: '58%' }} />}
            <span
              title={it.badgeDesc}
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 10px',
                borderRadius: 999,
                color: it.badgeColor,
                background: it.badgeBg,
                border: `1px solid ${it.badgeColor}55`
              }}
            >
              {it.badgeLabel}
            </span>
          </div>
          {it.badgeDesc && (
            <div style={{ fontSize: 12, color: '#8C958F', marginTop: 10, lineHeight: 1.5 }}>{it.badgeDesc}</div>
          )}
          {it.photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))', gap: 8, marginTop: 10 }}>
              {it.photos.map((p, i) => (
                <button
                  key={p.key}
                  onClick={() => setPhotoIdx(i)}
                  title={p.label}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: 10,
                    border: `1.5px solid ${i === photoIdx ? ACC : 'rgba(255,255,255,0.1)'}`,
                    background: `url(${p.url}) center/cover`,
                    cursor: 'pointer',
                    padding: 0
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,36px)', fontWeight: 800, fontStretch: '76%', textTransform: 'uppercase', lineHeight: 1.05 }}>{it.name}</h1>

          <div style={{ marginTop: 18, padding: 20, borderRadius: 18, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C958F' }}>Schätzwert</div>
              {it.valueChange && (
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 11.5, color: it.valueChange.color, background: it.valueChange.bg, padding: '3px 8px', borderRadius: 7 }}>
                  {it.valueChange.pctFmt} seit Einreichung
                </span>
              )}
            </div>
            {it.valuation && !it.valuation.blocked ? (
              <>
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, marginTop: 6 }}>
                  {v.money(it.valuation.low)} – {v.money(it.valuation.high)}
                </div>
                <div style={{ fontSize: 13, color: '#C9D0CB', marginTop: 4 }}>
                  Ø {v.money(it.valuation.mid)} · Vertrauen: {it.valuation.confidence}
                </div>
                <div style={{ fontSize: 11.5, color: '#8C958F', marginTop: 6 }}>{it.valuation.basisText}</div>
                {it.valueChange && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', fontFamily: MONO, fontSize: 12.5 }}>
                    <span style={{ color: '#8C958F' }}>Bei Einreichung</span>
                    <span>{it.valueChange.fromFmt}</span>
                    <span style={{ color: '#4A524D' }}>→</span>
                    <span style={{ color: '#8C958F' }}>Nach Verifizierung</span>
                    <span style={{ fontWeight: 700 }}>{it.valueChange.toFmt}</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13.5, color: '#E8B04B', marginTop: 8, lineHeight: 1.5 }}>{it.valuation?.reason || 'Noch keine Schätzung verfügbar.'}</div>
            )}
          </div>

          {it.precheck && (
            <div style={{ marginTop: 14, padding: 16, borderRadius: 16, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: it.precheck.status === 'ok' ? ACC : it.precheck.status === 'review' ? '#E8B04B' : '#FF6B5E' }}>
                Vorprüfung: {it.precheck.status === 'ok' ? 'Keine Auffälligkeiten' : it.precheck.status === 'review' ? 'Bitte prüfen' : 'Mögliche Fälschung'}
              </div>
            </div>
          )}

          {(it.verification.status === 'angefragt' || it.verification.status === 'in Prüfung' || it.verification.status === 'abgelehnt') && (
            <div style={{ marginTop: 14, padding: 16, borderRadius: 16, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C958F', marginBottom: 6 }}>Experten-Verifizierung</div>
              {it.verification.status === 'angefragt' && <div style={{ fontSize: 13.5, color: '#C9D0CB' }}>Anfrage gesendet — wird in Kürze an einen Experten übergeben …</div>}
              {it.verification.status === 'in Prüfung' && <div style={{ fontSize: 13.5, color: '#C9D0CB' }}>In Prüfung durch einen Experten …</div>}
              {it.verification.status === 'abgelehnt' && (
                <div style={{ fontSize: 13.5, color: '#FF6B5E', lineHeight: 1.5 }}>
                  Abgelehnt — {it.verification.reason}
                  {it.retryVerification && (
                    <button
                      onClick={it.retryVerification}
                      style={{ display: 'block', marginTop: 10, fontSize: 12.5, color: '#8C958F', background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      Erneut zur Prüfung einreichen
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, padding: 4, borderRadius: 18, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
            {rows.map(([k, val]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13.5 }}>
                <span style={{ color: '#8C958F' }}>{k}</span>
                <span style={{ textAlign: 'right', fontWeight: 500, maxWidth: '62%' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
