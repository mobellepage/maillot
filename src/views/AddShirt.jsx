import { useState } from 'react';
import ShirtGraphic from '../components/ShirtGraphic.jsx';
import { SHIRTS, BY } from '../data.ts';
import {
  VERSIONS,
  SLEEVES,
  SIZE_GROUPS,
  FLOCK_SOURCES,
  FLOCK_TYPES,
  DEFECTS,
  CONDITION_SCALE,
  VISIBILITIES,
  patchOptionsFor,
  buildPhotoSpecs,
  estimateValue
} from '../addShirtData.js';
import { analyzeAndCompress } from '../utils/image.ts';
import { useAddShirtForm } from './addshirt/useAddShirtForm.js';

const MONO = "'JetBrains Mono Variable','JetBrains Mono',monospace";
const ACC = '#4BFF8B';
const STEP_LABELS = ['Scan', 'Trikot', 'Details', 'Fotos', 'Vorprüfung', 'Verifizierung', 'Wert & Abschluss'];

function Section({ title, hint, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: hint ? 4 : 10 }}>{title}</div>
      {hint && <div style={{ fontSize: 12.5, color: '#8C958F', marginBottom: 10, lineHeight: 1.4 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 15px',
        borderRadius: 10,
        border: `1.5px solid ${active ? ACC : 'rgba(255,255,255,0.12)'}`,
        background: active ? 'rgba(75,255,139,0.1)' : '#121514',
        color: active ? '#F2F4F1' : '#C9D0CB',
        fontWeight: 600,
        fontSize: 13.5,
        cursor: 'pointer',
        transition: 'all .2s'
      }}
    >
      {children}
    </button>
  );
}

function PhotoSlot({ spec, data, busy, onFile, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 14, borderRadius: 16, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
      <label
        className="hov-border-acc6"
        style={{
          position: 'relative',
          flex: 'none',
          width: 84,
          height: 84,
          borderRadius: 12,
          border: data ? `1.5px solid ${data.lowRes || data.blurry ? '#E8B04B' : ACC}` : '1.5px dashed rgba(255,255,255,0.2)',
          background: data ? `url(${data.dataUrl}) center/cover` : '#0D100F',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'border-color .2s'
        }}
      >
        <input type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
        {!data && !busy && <span style={{ fontSize: 22, color: '#6F7872' }}>+</span>}
        {busy && <span style={{ fontFamily: MONO, fontSize: 10, color: '#8C958F' }}>…</span>}
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{spec.label}</div>
        {spec.hint && <div style={{ fontSize: 12, color: '#8C958F', marginTop: 2, lineHeight: 1.4 }}>{spec.hint}</div>}
        {data && (
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: ACC, background: 'rgba(75,255,139,0.1)', padding: '3px 7px', borderRadius: 6 }}>✓ Hochgeladen</span>
            {data.lowRes && <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#E8B04B', background: 'rgba(232,176,75,0.12)', padding: '3px 7px', borderRadius: 6 }}>Niedrige Auflösung</span>}
            {data.blurry && <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#E8B04B', background: 'rgba(232,176,75,0.12)', padding: '3px 7px', borderRadius: 6 }}>Evtl. unscharf</span>}
            <button onClick={onRemove} style={{ fontSize: 11, color: '#8C958F', background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              Neu aufnehmen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddShirt({ v }) {
  const { f, set, setPhoto, removePhoto, toggleArray, runScan, runPrecheck, requestVerification, reset } = useAddShirtForm(v.userId);
  const [busyPhoto, setBusyPhoto] = useState(null);

  const catalogItem = f.catalogId ? BY[f.catalogId] : null;
  const league = catalogItem ? catalogItem.league : 'National Teams';
  const photoSpecs = buildPhotoSpecs(f);
  const uploadedCount = photoSpecs.filter((s) => f.photos[s.key]).length;
  const allPhotosDone = uploadedCount === photoSpecs.length;

  const words = f.searchQ.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length ? SHIRTS.filter((s) => words.every((w) => s.hay.includes(w))).slice(0, 6) : [];

  // Weak scan match: real OCR found some text and it loosely matches a catalog item,
  // but not confidently enough to auto-select it — offer it up for a one-tap confirm.
  const weakScanMatch = f.scan.status === 'done' && f.scan.matchId && !f.catalogId ? BY[f.scan.matchId] : null;

  const pickCatalog = (s) => set({ catalogId: s.id, proposed: false, searchQ: s.name });
  const startProposal = () => set({ catalogId: null, proposed: true });

  const canNextFrom = [
    f.scan.status !== 'scanning',
    !!f.catalogId || (f.proposed && f.proposedClub.trim() && f.proposedSeason.trim()),
    !!f.version,
    allPhotosDone,
    !!f.precheck,
    true,
    false
  ];

  const goNext = () => set((s) => ({ step: Math.min(6, s.step + 1) }));
  const goBack = () => set((s) => ({ step: Math.max(0, s.step - 1) }));

  const onScanFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusyPhoto('product_code');
    try {
      const data = await analyzeAndCompress(file);
      await runScan({ ...data, label: 'Etikett mit Artikelnummer' });
    } finally {
      setBusyPhoto(null);
    }
  };

  const onPhotoFile = (spec) => async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusyPhoto(spec.key);
    try {
      const data = await analyzeAndCompress(file);
      setPhoto(spec.key, { ...data, label: spec.label });
    } finally {
      setBusyPhoto(null);
    }
  };

  const valuation = estimateValue({
    catalogItem,
    version: f.version,
    conditionGrade: f.condition.grade,
    flock: f.flock,
    patches: f.patches,
    signature: f.signature,
    verificationLevel: f.verification.level
  });

  const badge = v.verifyTiers.find((t) => t.level === f.verification.level) || v.verifyTiers.find((t) => t.level === 'self');

  const finish = () => {
    const item = {
      catalogId: f.catalogId,
      proposed: f.proposed,
      proposedClub: f.proposedClub,
      proposedSeason: f.proposedSeason,
      proposedVariant: f.proposedVariant,
      version: f.version,
      sizeGroup: f.sizeGroup,
      size: f.size,
      sleeve: f.sleeve,
      flock: f.flock,
      patches: f.patches,
      signature: f.signature,
      tagsAttached: f.tagsAttached,
      condition: f.condition,
      provenance: f.provenance,
      photos: f.photos,
      precheck: f.precheck,
      verification: f.verification,
      visibility: f.visibility,
      salePrice: f.visibility === 'forsale' ? parseInt(f.salePrice, 10) || 0 : null,
      valuation
    };
    reset();
    v.addCustomItem(item);
  };

  const cancel = () => {
    reset();
    v.cancelAddShirt();
  };

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,4vw,40px) 100px', animation: 'kvIn .4s ease both' }}>
      <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACC }}>Trikot hinzufügen</div>
      <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(30px,4.2vw,48px)', fontWeight: 800, fontStretch: '72%', textTransform: 'uppercase', lineHeight: 0.98 }}>
        {STEP_LABELS[f.step]}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 32px', overflowX: 'auto', paddingBottom: 4 }}>
        {STEP_LABELS.map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: i < f.step ? ACC : i === f.step ? '#F2F4F1' : '#1A1F1C',
                color: i <= f.step ? '#0A0C0B' : '#8C958F',
                display: 'grid',
                placeItems: 'center',
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 700,
                transition: 'background .3s'
              }}
            >
              {i + 1}
            </span>
            {i < 6 && <span style={{ width: 'clamp(14px,3vw,34px)', height: 2, borderRadius: 2, background: i < f.step ? ACC : 'rgba(255,255,255,0.1)' }} />}
          </div>
        ))}
      </div>

      {/* SCHRITT 0 — Scan (Artikelnummer-Etikett fotografieren, echte OCR + Katalogabgleich) */}
      {f.step === 0 && (
        <div>
          <Section title="Etikett mit Artikelnummer fotografieren" hint="Wir lesen den Text direkt im Browser aus (keine Serverübertragung) und schlagen sofort einen groben Treffer + Wertbereich vor.">
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 16, borderRadius: 18, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label
                className="hov-border-acc6"
                style={{
                  position: 'relative',
                  flex: 'none',
                  width: 96,
                  height: 96,
                  borderRadius: 14,
                  border: f.photos.product_code ? `1.5px solid ${f.photos.product_code.lowRes || f.photos.product_code.blurry ? '#E8B04B' : ACC}` : '1.5px dashed rgba(255,255,255,0.2)',
                  background: f.photos.product_code ? `url(${f.photos.product_code.dataUrl}) center/cover` : '#0D100F',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                <input type="file" accept="image/*" capture="environment" onChange={onScanFile} style={{ display: 'none' }} />
                {!f.photos.product_code && busyPhoto !== 'product_code' && <span style={{ fontSize: 24, color: '#6F7872' }}>+</span>}
                {busyPhoto === 'product_code' && <span style={{ fontFamily: MONO, fontSize: 10, color: '#8C958F' }}>…</span>}
              </label>
              <div style={{ flex: 1, minWidth: 0 }}>
                {f.scan.status === 'idle' && <div style={{ fontSize: 13.5, color: '#8C958F' }}>Noch kein Foto — tippe auf das Feld, um die Kamera zu öffnen.</div>}
                {f.scan.status === 'scanning' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#C9D0CB' }}>
                    <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(75,255,139,0.3)', borderTopColor: ACC, animation: 'kvSpin 0.8s linear infinite' }} />
                    Text wird gelesen …
                    <style>{'@keyframes kvSpin{to{transform:rotate(360deg)}}'}</style>
                  </div>
                )}
                {f.scan.status === 'error' && <div style={{ fontSize: 13.5, color: '#FF6B5E' }}>Texterkennung fehlgeschlagen — bitte erneut versuchen oder unten manuell suchen.</div>}
                {f.scan.status === 'done' && (
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: '#8C958F', marginBottom: 4 }}>ERKANNTER TEXT</div>
                    <div style={{ fontSize: 13, color: '#C9D0CB', wordBreak: 'break-word' }}>{f.scan.ocrText || '(kein Text erkannt)'}</div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {f.scan.status === 'done' && catalogItem && f.scan.matchId === f.catalogId && (
            <div style={{ padding: 16, borderRadius: 16, background: 'rgba(75,255,139,0.07)', border: '1px solid rgba(75,255,139,0.25)', marginBottom: 20, animation: 'kvIn .3s ease both' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: ACC, marginBottom: 4 }}>✓ VORLÄUFIGER TREFFER AUS SCAN</div>
              <div style={{ fontWeight: 600 }}>{catalogItem.name}</div>
              {!valuation.blocked && (
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                  {v.money(valuation.low)} – {v.money(valuation.high)}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#8C958F', marginTop: 4 }}>Grobe Schätzung — Details im nächsten Schritt verfeinern diesen Wert.</div>
            </div>
          )}

          {weakScanMatch && (
            <div style={{ padding: 16, borderRadius: 16, background: '#101312', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#8C958F', marginBottom: 4 }}>MÖGLICHER TREFFER (UNSICHER)</div>
              <div style={{ fontWeight: 600 }}>{weakScanMatch.name}</div>
              <button
                onClick={() => pickCatalog(weakScanMatch)}
                style={{ marginTop: 10, height: 40, padding: '0 16px', borderRadius: 10, border: `1px solid ${ACC}55`, background: 'rgba(75,255,139,0.1)', color: '#F2F4F1', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Das ist richtig
              </button>
            </div>
          )}

          {f.scan.status !== 'idle' && !catalogItem && !weakScanMatch && (
            <div style={{ fontSize: 13, color: '#8C958F', marginBottom: 20, lineHeight: 1.5 }}>Kein sicherer Katalogtreffer — kein Problem, du kannst im nächsten Schritt manuell suchen oder das Trikot neu vorschlagen.</div>
          )}
        </div>
      )}

      {/* SCHRITT 1 — Trikot identifizieren */}
      {f.step === 1 && (
        <div>
          <Section title="Suche nach Verein, Saison oder Variante" hint='z. B. "Juventus 1996" oder "UCL Final 2012"'>
            <input
              value={f.searchQ}
              onChange={(e) => set({ searchQ: e.target.value, catalogId: null, proposed: false })}
              placeholder="Verein, Nationalmannschaft, Saison …"
              style={{ width: '100%', height: 50, padding: '0 16px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 15, color: '#F2F4F1' }}
            />
            {matches.length > 0 && !f.catalogId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {matches.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => pickCatalog(s)}
                    className="hov-border-acc"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: '#121514', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0A0C0B', display: 'grid', placeItems: 'center', flex: 'none' }}>
                      <ShirtGraphic pat={s.pat} trim={s.trim} crest={s.crest} style={{ width: '82%' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#8C958F' }}>
                        {s.brand} · {s.league}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {catalogItem && (
            <div style={{ padding: 16, borderRadius: 16, background: 'rgba(75,255,139,0.07)', border: '1px solid rgba(75,255,139,0.25)', marginBottom: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: ACC, marginBottom: 4 }}>✓ AUS KATALOG ÜBERNOMMEN</div>
              <div style={{ fontWeight: 600 }}>{catalogItem.name}</div>
              <div style={{ fontSize: 12.5, color: '#8C958F', marginTop: 2 }}>
                Ausrüster: {catalogItem.brand} · {catalogItem.league} · {catalogItem.season}
              </div>
            </div>
          )}

          {!catalogItem && (
            <button onClick={startProposal} className="hov-border-acc6" style={{ width: '100%', height: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, cursor: 'pointer' }}>
              Kein Treffer? Neues Trikot vorschlagen
            </button>
          )}

          {f.proposed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <div style={{ fontSize: 12.5, color: '#8C958F', lineHeight: 1.4 }}>
                Dein Vorschlag wird nach dem Speichern zur Prüfung an unser Katalog-Team gesendet.
              </div>
              <input
                value={f.proposedClub}
                onChange={(e) => set({ proposedClub: e.target.value })}
                placeholder="Verein / Nationalmannschaft"
                style={{ height: 48, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14.5, color: '#F2F4F1' }}
              />
              <input
                value={f.proposedSeason}
                onChange={(e) => set({ proposedSeason: e.target.value })}
                placeholder="Saison, z. B. 2011/12"
                style={{ height: 48, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14.5, color: '#F2F4F1' }}
              />
              <input
                value={f.proposedVariant}
                onChange={(e) => set({ proposedVariant: e.target.value })}
                placeholder="Variante, z. B. Home / Away / UCL Final 2012"
                style={{ height: 48, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14.5, color: '#F2F4F1' }}
              />
            </div>
          )}
        </div>
      )}

      {/* SCHRITT 2 — Version & Details */}
      {f.step === 2 && (
        <div>
          <Section title="Version *">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {VERSIONS.map((ver) => (
                <Pill key={ver} active={f.version === ver} onClick={() => set({ version: ver })}>
                  {ver}
                </Pill>
              ))}
            </div>
          </Section>

          <Section title="Grösse & Ärmel *">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {Object.keys(SIZE_GROUPS).map((g) => (
                <Pill key={g} active={f.sizeGroup === g} onClick={() => set({ sizeGroup: g, size: SIZE_GROUPS[g][0] })}>
                  {g}
                </Pill>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {SIZE_GROUPS[f.sizeGroup].map((z) => (
                <Pill key={z} active={f.size === z} onClick={() => set({ size: z })}>
                  {z}
                </Pill>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {SLEEVES.map((sl) => (
                <Pill key={sl} active={f.sleeve === sl} onClick={() => set({ sleeve: sl })}>
                  {sl}
                </Pill>
              ))}
            </div>
          </Section>

          <Section title="Flock">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {FLOCK_SOURCES.map((src) => (
                <Pill key={src} active={f.flock.source === src} onClick={() => set((s) => ({ flock: { ...s.flock, source: src } }))}>
                  {src}
                </Pill>
              ))}
            </div>
            {f.flock.source !== 'Keine' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={f.flock.name}
                  onChange={(e) => set((s) => ({ flock: { ...s.flock, name: e.target.value } }))}
                  placeholder="Name"
                  style={{ height: 46, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14.5, color: '#F2F4F1' }}
                />
                <input
                  value={f.flock.number}
                  onChange={(e) => set((s) => ({ flock: { ...s.flock, number: e.target.value.replace(/[^0-9]/g, '') } }))}
                  placeholder="Nummer"
                  style={{ height: 46, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14.5, color: '#F2F4F1' }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {FLOCK_TYPES.map((t) => (
                    <Pill key={t} active={f.flock.type === t} onClick={() => set((s) => ({ flock: { ...s.flock, type: t } }))}>
                      {t}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Patches" hint="Mehrfachauswahl, passend zu Wettbewerb/Saison.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {patchOptionsFor(league).map((p) => (
                <Pill key={p} active={f.patches.includes(p)} onClick={() => toggleArray('patches', p)}>
                  {p}
                </Pill>
              ))}
            </div>
          </Section>

          <Section title="Signiert?">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <Pill active={!f.signature.signed} onClick={() => set((s) => ({ signature: { ...s.signature, signed: false } }))}>
                Nein
              </Pill>
              <Pill active={f.signature.signed} onClick={() => set((s) => ({ signature: { ...s.signature, signed: true } }))}>
                Ja
              </Pill>
            </div>
            {f.signature.signed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={f.signature.by}
                  onChange={(e) => set((s) => ({ signature: { ...s.signature, by: e.target.value } }))}
                  placeholder="Signiert von"
                  style={{ height: 46, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14.5, color: '#F2F4F1' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Pill active={!f.signature.hasCoa} onClick={() => set((s) => ({ signature: { ...s.signature, hasCoa: false } }))}>
                    Kein COA
                  </Pill>
                  <Pill active={f.signature.hasCoa} onClick={() => set((s) => ({ signature: { ...s.signature, hasCoa: true } }))}>
                    COA vorhanden
                  </Pill>
                </div>
                {f.signature.hasCoa && (
                  <input
                    value={f.signature.issuer}
                    onChange={(e) => set((s) => ({ signature: { ...s.signature, issuer: e.target.value } }))}
                    placeholder="Aussteller des COA"
                    style={{ height: 46, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14.5, color: '#F2F4F1' }}
                  />
                )}
              </div>
            )}
          </Section>

          <Section title="Anhänger (BNWT) noch dran?">
            <div style={{ display: 'flex', gap: 8 }}>
              <Pill active={!f.tagsAttached} onClick={() => set({ tagsAttached: false })}>
                Nein
              </Pill>
              <Pill active={f.tagsAttached} onClick={() => set({ tagsAttached: true })}>
                Ja
              </Pill>
            </div>
          </Section>

          <Section title="Zustand *">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,210px),1fr))', gap: 8 }}>
              {CONDITION_SCALE.map((c) => (
                <button
                  key={c.grade}
                  onClick={() => set((s) => ({ condition: { ...s.condition, grade: c.grade } }))}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: `1.5px solid ${f.condition.grade === c.grade ? ACC : 'rgba(255,255,255,0.08)'}`,
                    background: f.condition.grade === c.grade ? 'rgba(75,255,139,0.07)' : '#121514',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all .2s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {c.grade}/10 · {c.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#8C958F', marginTop: 4, lineHeight: 1.4 }}>{c.desc}</div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Mängel" hint="Mehrfachauswahl, falls zutreffend.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DEFECTS.map((d) => (
                <Pill key={d} active={f.condition.defects.includes(d)} onClick={() => set((s) => ({ condition: { ...s.condition, defects: s.condition.defects.includes(d) ? s.condition.defects.filter((x) => x !== d) : [...s.condition.defects, d] } }))}>
                  {d}
                </Pill>
              ))}
            </div>
          </Section>

          <Section title="Provenienz / Geschichte" hint="Optional — z. B. woher das Trikot stammt.">
            <textarea
              value={f.provenance}
              onChange={(e) => set({ provenance: e.target.value })}
              rows={3}
              placeholder="z. B. direkt vom Spieler erhalten, Auktionshaus …"
              style={{ width: '100%', padding: 14, borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14.5, color: '#F2F4F1', resize: 'vertical' }}
            />
          </Section>
        </div>
      )}

      {/* SCHRITT 3 — Geführter Foto-Upload */}
      {f.step === 3 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13.5, color: '#C9D0CB' }}>Gute, gleichmässige Beleuchtung verwenden. Jedes Foto wird automatisch komprimiert, Standortdaten werden entfernt.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: (uploadedCount / photoSpecs.length) * 100 + '%', background: ACC, transition: 'width .3s' }} />
            </div>
            <span style={{ fontFamily: MONO, fontSize: 12.5, color: '#8C958F', flex: 'none' }}>
              {uploadedCount}/{photoSpecs.length} Fotos
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {photoSpecs.map((spec) => (
              <PhotoSlot key={spec.key} spec={spec} data={f.photos[spec.key]} busy={busyPhoto === spec.key} onFile={onPhotoFile(spec)} onRemove={() => removePhoto(spec.key)} />
            ))}
          </div>
        </div>
      )}

      {/* SCHRITT 4 — Vorprüfung (echte Signale: OCR-Textabgleich aus dem Scan-Schritt + Foto-Schärfe/Auflösung) */}
      {f.step === 4 && (
        <div>
          {!f.precheck && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 14.5, color: '#C9D0CB', marginBottom: 20, lineHeight: 1.5 }}>
                Wir werten den beim Scan erkannten Etikett-Text, die Katalog-Übereinstimmung, Patches/Version und die Fotoqualität aus.
              </div>
              <button onClick={runPrecheck} className="hov-glow" style={{ height: 52, padding: '0 28px', borderRadius: 14, border: 0, background: ACC, color: '#06110A', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                Vorprüfung starten
              </button>
            </div>
          )}

          {f.precheck && (
            <div
              style={{
                padding: 22,
                borderRadius: 20,
                background: f.precheck.status === 'ok' ? 'rgba(75,255,139,0.08)' : f.precheck.status === 'review' ? 'rgba(232,176,75,0.08)' : 'rgba(255,107,94,0.08)',
                border: `1px solid ${f.precheck.status === 'ok' ? 'rgba(75,255,139,0.3)' : f.precheck.status === 'review' ? 'rgba(232,176,75,0.35)' : 'rgba(255,107,94,0.35)'}`
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17, color: f.precheck.status === 'ok' ? ACC : f.precheck.status === 'review' ? '#E8B04B' : '#FF6B5E' }}>
                {f.precheck.status === 'ok' ? 'Keine Auffälligkeiten' : f.precheck.status === 'review' ? 'Bitte prüfen' : 'Mögliche Fälschung'}
              </div>
              <ul style={{ margin: '12px 0 0', padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {f.precheck.notes.map((n, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: '#C9D0CB', lineHeight: 1.4 }}>
                    {n}
                  </li>
                ))}
              </ul>
              <div style={{ fontSize: 12, color: '#8C958F', marginTop: 14, lineHeight: 1.4 }}>
                Dies ist eine automatische Vorprüfung, keine Garantie für Echtheit. Für eine verbindliche Einschätzung nutze die Experten-Verifizierung im nächsten Schritt.
              </div>
              <button onClick={runPrecheck} style={{ marginTop: 14, fontSize: 12.5, color: '#8C958F', background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline' }}>
                Erneut prüfen
              </button>
            </div>
          )}
        </div>
      )}

      {/* SCHRITT 5 — Verifizierungsstufe */}
      {f.step === 5 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 18, borderRadius: 18, background: badge.bg, border: `1px solid ${badge.color}55`, marginBottom: 20 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: badge.color, flex: 'none' }} />
            <div>
              <div style={{ fontWeight: 700, color: badge.color }}>{badge.label}</div>
              <div style={{ fontSize: 12.5, color: '#8C958F', marginTop: 2 }}>{badge.desc}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {v.verifyTiers.map((t) => (
              <div key={t.level} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5, color: '#6F7872' }}>
                <span style={{ fontFamily: MONO, fontWeight: 700, color: t.color, flex: 'none' }}>{t.label}</span>
                <span>{t.desc}</span>
              </div>
            ))}
          </div>

          {f.version === 'Match-Worn' && f.verification.level !== 'expert' && (
            <div style={{ fontSize: 13, color: '#E8B04B', marginBottom: 16, lineHeight: 1.5 }}>
              Für Match-Worn-Trikots ist eine Experten-Verifizierung Voraussetzung, bevor ein Schätzwert angezeigt wird.
            </div>
          )}

          {f.verification.status === 'none' && (
            <button onClick={requestVerification} className="hov-glow" style={{ height: 52, padding: '0 26px', borderRadius: 14, border: 0, background: ACC, color: '#06110A', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Verifizierung anfragen (kostenpflichtig)
            </button>
          )}
          {f.verification.status === 'angefragt' && <div style={{ fontSize: 14, color: '#C9D0CB' }}>Anfrage gesendet — wird in Kürze an einen Experten übergeben …</div>}
          {f.verification.status === 'in Prüfung' && <div style={{ fontSize: 14, color: '#C9D0CB' }}>In Prüfung durch einen Experten …</div>}
          {f.verification.status === 'verifiziert' && <div style={{ fontSize: 14, color: ACC, fontWeight: 600 }}>✓ Verifiziert</div>}
          {f.verification.status === 'abgelehnt' && (
            <div style={{ fontSize: 14, color: '#FF6B5E' }}>
              Abgelehnt — {f.verification.reason}
              <button onClick={requestVerification} style={{ display: 'block', marginTop: 10, fontSize: 12.5, color: '#8C958F', background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline' }}>
                Erneut anfragen
              </button>
            </div>
          )}
        </div>
      )}

      {/* SCHRITT 6 — Schätzwert & Abschluss */}
      {f.step === 6 && (
        <div>
          <Section title="Schätzwert">
            {valuation.blocked ? (
              <div style={{ padding: 20, borderRadius: 18, background: 'rgba(232,176,75,0.08)', border: '1px solid rgba(232,176,75,0.3)', fontSize: 13.5, color: '#E8B04B', lineHeight: 1.5 }}>
                {valuation.reason}
              </div>
            ) : (
              <div style={{ padding: 20, borderRadius: 18, background: '#101312', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700 }}>
                  {v.money(valuation.low)} – {v.money(valuation.high)}
                </div>
                <div style={{ fontSize: 13.5, color: '#C9D0CB', marginTop: 6 }}>Ø {v.money(valuation.mid)} · Vertrauen: {valuation.confidence}</div>
                <div style={{ fontSize: 12, color: '#8C958F', marginTop: 8 }}>{valuation.basisText}</div>
              </div>
            )}
          </Section>

          <Section title="Sichtbarkeit">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {VISIBILITIES.map((o) => (
                <button
                  key={o.key}
                  onClick={() => set({ visibility: o.key })}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 14,
                    border: `1.5px solid ${f.visibility === o.key ? ACC : 'rgba(255,255,255,0.08)'}`,
                    background: f.visibility === o.key ? 'rgba(75,255,139,0.07)' : '#121514',
                    cursor: 'pointer',
                    transition: 'all .2s'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{o.label}</span>
                  <span style={{ fontSize: 12, color: '#8C958F' }}>{o.desc}</span>
                </button>
              ))}
            </div>
            {f.visibility === 'forsale' && (
              <input
                value={f.salePrice}
                onChange={(e) => set({ salePrice: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder={'Preis in CHF' + (valuation.blocked ? '' : ' · Richtwert ' + valuation.mid)}
                style={{ width: '100%', height: 48, padding: '0 14px', borderRadius: 12, background: '#121514', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14.5, color: '#F2F4F1', marginTop: 10 }}
              />
            )}
          </Section>

          <button onClick={finish} className="hov-primary" style={{ width: '100%', height: 56, borderRadius: 14, border: 0, background: ACC, color: '#06110A', fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'box-shadow .2s,transform .15s' }}>
            Speichern
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 36 }}>
        <button onClick={f.step === 0 ? cancel : goBack} style={{ height: 50, padding: '0 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)', background: 'none', color: '#F2F4F1', fontWeight: 600, cursor: 'pointer' }}>
          {f.step === 0 ? 'Abbrechen' : '← Zurück'}
        </button>
        {f.step < 6 && (
          <button
            onClick={goNext}
            disabled={!canNextFrom[f.step]}
            className="hov-next"
            style={{
              height: 50,
              padding: '0 26px',
              borderRadius: 14,
              border: 0,
              background: canNextFrom[f.step] ? '#F2F4F1' : 'rgba(255,255,255,0.12)',
              color: canNextFrom[f.step] ? '#0A0C0B' : '#6F7872',
              fontWeight: 700,
              cursor: canNextFrom[f.step] ? 'pointer' : 'not-allowed',
              transition: 'background .2s'
            }}
          >
            Weiter →
          </button>
        )}
      </div>
    </main>
  );
}
