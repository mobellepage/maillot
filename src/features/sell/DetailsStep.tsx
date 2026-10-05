import { usePrefs } from '../../lib/prefs.tsx';
import { TextField } from '../../ui/index.ts';
import { SelectedShirt } from './ShirtPickRow.tsx';
import { CONDITIONS, EDITIONS, type SellFlow } from './useSellFlow.ts';

export function DetailsStep({ f }: { f: SellFlow }) {
  const s = f.shirt!;
  const { t, label } = usePrefs();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 760, animation: 'kvIn .35s ease both' }}>
      <SelectedShirt s={s} onChange={() => f.go(0)} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t('sell.size')}</legend>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {s.sizes.map((z) => (
            <button key={z} type="button" className="option-btn" aria-pressed={f.size === z} onClick={() => f.setSize(z)} style={{ minWidth: 64, height: 48, padding: '0 12px', fontWeight: 700, textAlign: 'center' }}>
              {z}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t('sell.condition')}</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,170px),1fr))', gap: 8 }}>
          {CONDITIONS.map(([l, d]) => (
            <button key={l} type="button" className="option-btn" aria-pressed={f.condition === l} onClick={() => f.setCondition(l)} style={{ padding: 14 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{label('cond', l)}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{t(d)}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t('sell.edition')}</legend>
        <div className="segmented" style={{ flexWrap: 'wrap', borderRadius: 14 }}>
          {EDITIONS.map((x) => (
            <button key={x} type="button" aria-pressed={f.edition === x} onClick={() => f.setEdition(x)} style={{ borderRadius: 10, padding: '9px 16px' }}>
              {label('edition', x)}
            </button>
          ))}
        </div>
      </fieldset>
      <TextField label={<>{t('sell.playerPrint')} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{t('sell.optional')}</span></>} value={f.player} onChange={(e) => f.setPlayer(e.target.value.slice(0, 60))} placeholder={t('sell.playerPlaceholder')} />
    </div>
  );
}
