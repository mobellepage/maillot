import { VISIBILITIES } from '../../../addShirtData.js';
import { usePrefs } from '../../../lib/prefs.tsx';
import type { Valuation, Visibility } from '../../../types/domain.ts';
import { Button, Card, Notice } from '../../../ui/index.ts';
import { Section } from './parts.tsx';
import { inputStyle } from './styles.ts';
import type { Wizard } from './useAddShirtForm.ts';

export function FinishStep({ w, valuation, onSave, saving }: { w: Wizard; valuation: Valuation; onSave: () => void; saving: boolean }) {
  const { money } = usePrefs();
  const { f, set } = w;
  return (
    <div>
      <Section title="Schätzwert">
        {valuation.blocked ? (
          <Notice tone="warn">{valuation.reason}</Notice>
        ) : (
          <Card tight style={{ padding: 20, borderRadius: 18 }}>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700 }}>
              {money(valuation.low)} – {money(valuation.high)}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 6 }}>
              Ø {money(valuation.mid)} · Vertrauen: {valuation.confidence}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{valuation.basisText}</div>
          </Card>
        )}
      </Section>
      <Section title="Sichtbarkeit">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(VISIBILITIES as { key: Visibility; label: string; desc: string }[]).map((o) => (
            <button key={o.key} type="button" className="option-btn" aria-pressed={f.visibility === o.key} onClick={() => set({ visibility: o.key })} style={{ padding: 14 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{o.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{o.desc}</span>
            </button>
          ))}
        </div>
        {f.visibility === 'forsale' && (
          <input aria-label="Preis in CHF" inputMode="numeric" value={f.salePrice} onChange={(e) => set({ salePrice: e.target.value.replace(/[^0-9]/g, '') })} placeholder={'Preis in CHF' + (valuation.blocked ? '' : ' · Richtwert ' + valuation.mid)} style={{ ...inputStyle, marginTop: 10 }} />
        )}
      </Section>
      <Button block size="lg" busy={saving} busyLabel="Speichern…" onClick={onSave}>
        Speichern
      </Button>
    </div>
  );
}
