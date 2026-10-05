import { CONDITION_SCALE, DEFECTS, FLOCK_SOURCES, FLOCK_TYPES, patchOptionsFor, SIZE_GROUPS, SLEEVES, VERSIONS } from '../../../addShirtData.js';
import { BY } from '../../../data.ts';
import { Pill, Pills, Section } from './parts.tsx';
import { inputStyle } from './styles.ts';
import type { Wizard } from './useAddShirtForm.ts';

const GROUPS = SIZE_GROUPS as Record<string, string[]>;

export function DetailsStep({ w }: { w: Wizard }) {
  const { f, set, togglePatch } = w;
  const league = f.catalogId && BY[f.catalogId] ? BY[f.catalogId]!.league : 'National Teams';
  const flock = (patch: Partial<typeof f.flock>) => set((s) => ({ flock: { ...s.flock, ...patch } }));
  const sig = (patch: Partial<typeof f.signature>) => set((s) => ({ signature: { ...s.signature, ...patch } }));
  return (
    <div>
      <Section title="Version *">
        <Pills>
          {VERSIONS.map((v: string) => (
            <Pill key={v} active={f.version === v} onClick={() => set({ version: v })}>
              {v}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title="Grösse & Ärmel *">
        <Pills>
          {Object.keys(GROUPS).map((g) => (
            <Pill key={g} active={f.sizeGroup === g} onClick={() => set({ sizeGroup: g, size: GROUPS[g]![0]! })}>
              {g}
            </Pill>
          ))}
        </Pills>
        <Pills>
          {(GROUPS[f.sizeGroup] ?? []).map((z) => (
            <Pill key={z} active={f.size === z} onClick={() => set({ size: z })}>
              {z}
            </Pill>
          ))}
        </Pills>
        <Pills>
          {SLEEVES.map((sl: string) => (
            <Pill key={sl} active={f.sleeve === sl} onClick={() => set({ sleeve: sl })}>
              {sl}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title="Flock">
        <Pills>
          {FLOCK_SOURCES.map((src: string) => (
            <Pill key={src} active={f.flock.source === src} onClick={() => flock({ source: src })}>
              {src}
            </Pill>
          ))}
        </Pills>
        {f.flock.source !== 'Keine' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input aria-label="Flock-Name" value={f.flock.name} onChange={(e) => flock({ name: e.target.value })} placeholder="Name" style={inputStyle} />
            <input aria-label="Flock-Nummer" inputMode="numeric" value={f.flock.number} onChange={(e) => flock({ number: e.target.value.replace(/[^0-9]/g, '') })} placeholder="Nummer" style={inputStyle} />
            <Pills>
              {FLOCK_TYPES.map((t: string) => (
                <Pill key={t} active={f.flock.type === t} onClick={() => flock({ type: t })}>
                  {t}
                </Pill>
              ))}
            </Pills>
          </div>
        )}
      </Section>
      <Section title="Patches" hint="Mehrfachauswahl, passend zu Wettbewerb/Saison.">
        <Pills>
          {patchOptionsFor(league).map((p: string) => (
            <Pill key={p} active={f.patches.includes(p)} onClick={() => togglePatch(p)}>
              {p}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title="Signiert?">
        <Pills>
          <Pill active={!f.signature.signed} onClick={() => sig({ signed: false })}>
            Nein
          </Pill>
          <Pill active={f.signature.signed} onClick={() => sig({ signed: true })}>
            Ja
          </Pill>
        </Pills>
        {f.signature.signed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input aria-label="Signiert von" value={f.signature.by} onChange={(e) => sig({ by: e.target.value })} placeholder="Signiert von" style={inputStyle} />
            <Pills>
              <Pill active={!f.signature.hasCoa} onClick={() => sig({ hasCoa: false })}>
                Kein COA
              </Pill>
              <Pill active={f.signature.hasCoa} onClick={() => sig({ hasCoa: true })}>
                COA vorhanden
              </Pill>
            </Pills>
            {f.signature.hasCoa && <input aria-label="Aussteller des COA" value={f.signature.issuer} onChange={(e) => sig({ issuer: e.target.value })} placeholder="Aussteller des COA" style={inputStyle} />}
          </div>
        )}
      </Section>
      <Section title="Anhänger (BNWT) noch dran?">
        <Pills>
          <Pill active={!f.tagsAttached} onClick={() => set({ tagsAttached: false })}>
            Nein
          </Pill>
          <Pill active={f.tagsAttached} onClick={() => set({ tagsAttached: true })}>
            Ja
          </Pill>
        </Pills>
      </Section>
      <Section title="Zustand *">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,210px),1fr))', gap: 8 }}>
          {CONDITION_SCALE.map((c: { grade: number; label: string; desc: string }) => (
            <button key={c.grade} type="button" className="option-btn" aria-pressed={f.condition.grade === c.grade} onClick={() => set((s) => ({ condition: { ...s.condition, grade: c.grade } }))} style={{ padding: 14 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>
                {c.grade}/10 · {c.label}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{c.desc}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Mängel" hint="Mehrfachauswahl, falls zutreffend.">
        <Pills>
          {DEFECTS.map((d: string) => (
            <Pill key={d} active={f.condition.defects.includes(d)} onClick={() => set((s) => ({ condition: { ...s.condition, defects: s.condition.defects.includes(d) ? s.condition.defects.filter((x) => x !== d) : [...s.condition.defects, d] } }))}>
              {d}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title="Provenienz / Geschichte" hint="Optional — z. B. woher das Trikot stammt.">
        <textarea aria-label="Provenienz" value={f.provenance} onChange={(e) => set({ provenance: e.target.value })} rows={3} placeholder="z. B. direkt vom Spieler erhalten, Auktionshaus …" style={{ ...inputStyle, height: 'auto', padding: 14, resize: 'vertical' }} />
      </Section>
    </div>
  );
}
