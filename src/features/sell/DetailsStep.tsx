import { usePrefs } from '../../lib/prefs.tsx';
import { TextField } from '../../ui/index.ts';
import { SelectedShirt } from './ShirtPickRow.tsx';
import { CONDITIONS, EDITIONS, LISTING_PHOTOS, type SellFlow } from './useSellFlow.ts';
import { PhotoInput } from '../vault/addshirt/parts.tsx';
import type { CompressedPhoto } from '../../utils/image.ts';
import type { Photo } from '../../types/domain.ts';

const asPhoto = (p: CompressedPhoto | undefined): Photo | undefined =>
  p && { dataUrl: p.dataUrl, lowRes: p.lowRes, blurry: p.blurry, tooDark: p.tooDark, tooBright: p.tooBright };

/** Photos of the actual shirt: buyers see exactly what they get. The front is required. */
function ListingPhotos({ f }: { f: SellFlow }) {
  const { t } = usePrefs();
  const warn = Object.values(f.photos).some((p) => p.lowRes || p.blurry || p.tooDark || p.tooBright);
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t('sell.photos')}</legend>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.45 }}>{t('sell.photosHint')}</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {LISTING_PHOTOS.map(([kind, key]) => (
          <div key={kind} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
            <PhotoInput size={96} data={asPhoto(f.photos[kind])} busy={f.photoBusy === kind} onFile={(file) => f.addPhoto(kind, file)} label={t(key)} />
            <span style={{ fontSize: 12, color: kind === 'front' && !f.photos.front ? 'var(--text)' : 'var(--text-2)', fontWeight: kind === 'front' ? 600 : 400 }}>
              {t(key)}
              {kind === 'front' && ' *'}
            </span>
          </div>
        ))}
      </div>
      {warn && <p style={{ fontSize: 12.5, color: 'var(--warn)', marginTop: 10 }}>{t('sell.photoQuality')}</p>}
    </fieldset>
  );
}

export function DetailsStep({ f }: { f: SellFlow }) {
  const s = f.shirt!;
  const { t, label } = usePrefs();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 760, animation: 'kvIn .35s ease both' }}>
      <SelectedShirt s={s} onChange={() => f.go(0)} />
      <ListingPhotos f={f} />
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
