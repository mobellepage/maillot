import { VISIBILITIES } from '../../../addShirtData.js';
import { usePrefs } from '../../../lib/prefs.tsx';
import type { Valuation, Visibility } from '../../../types/domain.ts';
import { Button, Card, Notice } from '../../../ui/index.ts';
import { Section } from './parts.tsx';
import { inputStyle } from './styles.ts';
import type { Wizard } from './useAddShirtForm.ts';

export function FinishStep({ w, valuation, onSave, saving }: { w: Wizard; valuation: Valuation; onSave: () => void; saving: boolean }) {
  const { money, t, label } = usePrefs();
  const { f, set } = w;
  return (
    <div>
      <Section title={t('as.f.estimate')}>
        {valuation.blocked ? (
          <Notice tone="warn">{t(valuation.reason ?? '')}</Notice>
        ) : (
          <Card tight style={{ padding: 20, borderRadius: 18 }}>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700 }}>
              {money(valuation.low)} – {money(valuation.high)}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 6 }}>
              {t('as.f.confidence', { mid: money(valuation.mid), c: label('opt', valuation.confidence ?? '') })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{valuation.basis ? t(valuation.basis.key, valuation.basis.vars) : valuation.basisText}</div>
          </Card>
        )}
      </Section>
      <Section title={t('as.f.visibility')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(VISIBILITIES as { key: Visibility; label: string; desc: string }[]).map((o) => (
            <button key={o.key} type="button" className="option-btn" aria-pressed={f.visibility === o.key} onClick={() => set({ visibility: o.key })} style={{ padding: 14 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{t(o.label)}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{t(o.desc)}</span>
            </button>
          ))}
        </div>
        {f.visibility === 'forsale' && (
          <input aria-label={t('as.f.price')} inputMode="numeric" value={f.salePrice} onChange={(e) => set({ salePrice: e.target.value.replace(/[^0-9]/g, '') })} placeholder={valuation.blocked ? t('as.f.price') : t('as.f.pricePh', { mid: valuation.mid })} style={{ ...inputStyle, marginTop: 10 }} />
        )}
      </Section>
      <Button block size="lg" busy={saving} busyLabel={t('as.f.saving')} onClick={onSave}>
        {t('as.f.save')}
      </Button>
    </div>
  );
}
