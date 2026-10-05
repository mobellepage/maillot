import { CONDITION_SCALE, DEFECTS, FLOCK_SOURCES, FLOCK_TYPES, patchOptionsFor, SIZE_GROUPS, SLEEVES, VERSIONS } from '../../../addShirtData.js';
import { BY } from '../../../data.ts';
import { Pill, Pills, Section } from './parts.tsx';
import { inputStyle } from './styles.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import type { Wizard } from './useAddShirtForm.ts';

const GROUPS = SIZE_GROUPS as Record<string, string[]>;

export function DetailsStep({ w }: { w: Wizard }) {
  const { f, set, togglePatch } = w;
  const { t, label } = usePrefs();
  const league = f.catalogId && BY[f.catalogId] ? BY[f.catalogId]!.league : 'National Teams';
  const flock = (patch: Partial<typeof f.flock>) => set((s) => ({ flock: { ...s.flock, ...patch } }));
  const sig = (patch: Partial<typeof f.signature>) => set((s) => ({ signature: { ...s.signature, ...patch } }));
  return (
    <div>
      <Section title={t('as.d.version')}>
        <Pills>
          {VERSIONS.map((v: string) => (
            <Pill key={v} active={f.version === v} onClick={() => set({ version: v })}>
              {label('opt', v)}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title={t('as.d.size')}>
        <Pills>
          {Object.keys(GROUPS).map((g) => (
            <Pill key={g} active={f.sizeGroup === g} onClick={() => set({ sizeGroup: g, size: GROUPS[g]![0]! })}>
              {label('opt', g)}
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
              {label('opt', sl)}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title={t('as.d.flock')}>
        <Pills>
          {FLOCK_SOURCES.map((src: string) => (
            <Pill key={src} active={f.flock.source === src} onClick={() => flock({ source: src })}>
              {label('opt', src)}
            </Pill>
          ))}
        </Pills>
        {f.flock.source !== 'Keine' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input aria-label={t('as.d.flockName')} value={f.flock.name} onChange={(e) => flock({ name: e.target.value })} placeholder={t('as.d.name')} style={inputStyle} />
            <input aria-label={t('as.d.flockNumber')} inputMode="numeric" value={f.flock.number} onChange={(e) => flock({ number: e.target.value.replace(/[^0-9]/g, '') })} placeholder={t('as.d.number')} style={inputStyle} />
            <Pills>
              {FLOCK_TYPES.map((ft: string) => (
                <Pill key={ft} active={f.flock.type === ft} onClick={() => flock({ type: ft })}>
                  {label('opt', ft)}
                </Pill>
              ))}
            </Pills>
          </div>
        )}
      </Section>
      <Section title={t('as.d.patches')} hint={t('as.d.patchesHint')}>
        <Pills>
          {patchOptionsFor(league).map((p: string) => (
            <Pill key={p} active={f.patches.includes(p)} onClick={() => togglePatch(p)}>
              {label('opt', p)}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title={t('as.d.signed')}>
        <Pills>
          <Pill active={!f.signature.signed} onClick={() => sig({ signed: false })}>
            {t('as.d.no')}
          </Pill>
          <Pill active={f.signature.signed} onClick={() => sig({ signed: true })}>
            {t('as.d.yes')}
          </Pill>
        </Pills>
        {f.signature.signed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input aria-label={t('as.d.signedBy')} value={f.signature.by} onChange={(e) => sig({ by: e.target.value })} placeholder={t('as.d.signedBy')} style={inputStyle} />
            <Pills>
              <Pill active={!f.signature.hasCoa} onClick={() => sig({ hasCoa: false })}>
                {t('as.d.noCoa')}
              </Pill>
              <Pill active={f.signature.hasCoa} onClick={() => sig({ hasCoa: true })}>
                {t('as.d.hasCoa')}
              </Pill>
            </Pills>
            {f.signature.hasCoa && <input aria-label={t('as.d.coaIssuer')} value={f.signature.issuer} onChange={(e) => sig({ issuer: e.target.value })} placeholder={t('as.d.coaIssuer')} style={inputStyle} />}
          </div>
        )}
      </Section>
      <Section title={t('as.d.tags')}>
        <Pills>
          <Pill active={!f.tagsAttached} onClick={() => set({ tagsAttached: false })}>
            {t('as.d.no')}
          </Pill>
          <Pill active={f.tagsAttached} onClick={() => set({ tagsAttached: true })}>
            {t('as.d.yes')}
          </Pill>
        </Pills>
      </Section>
      <Section title={t('as.d.condition')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,210px),1fr))', gap: 8 }}>
          {CONDITION_SCALE.map((c: { grade: number; label: string; desc: string }) => (
            <button key={c.grade} type="button" className="option-btn" aria-pressed={f.condition.grade === c.grade} onClick={() => set((s) => ({ condition: { ...s.condition, grade: c.grade } }))} style={{ padding: 14 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>
                {c.grade}/10 · {t(c.label)}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{t(c.desc)}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title={t('as.d.defects')} hint={t('as.d.defectsHint')}>
        <Pills>
          {DEFECTS.map((d: string) => (
            <Pill key={d} active={f.condition.defects.includes(d)} onClick={() => set((s) => ({ condition: { ...s.condition, defects: s.condition.defects.includes(d) ? s.condition.defects.filter((x) => x !== d) : [...s.condition.defects, d] } }))}>
              {label('opt', d)}
            </Pill>
          ))}
        </Pills>
      </Section>
      <Section title={t('as.d.provenance')} hint={t('as.d.provenanceHint')}>
        <textarea aria-label={t('as.d.provenanceLabel')} value={f.provenance} onChange={(e) => set({ provenance: e.target.value })} rows={3} placeholder={t('as.d.provenancePh')} style={{ ...inputStyle, height: 'auto', padding: 14, resize: 'vertical' }} />
      </Section>
    </div>
  );
}
