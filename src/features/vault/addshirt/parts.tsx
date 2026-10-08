import type { ChangeEvent, ReactNode } from 'react';
import type { Photo } from '../../../types/domain.ts';
import { usePrefs } from '../../../lib/prefs.tsx';
import { usePhotoUrls } from '../../../lib/usePhotoUrls.ts';

export function Section({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 28px' }}>
      <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: hint ? 4 : 10, padding: 0 }}>{title}</legend>
      {hint && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.4 }}>{hint}</div>}
      {children}
    </fieldset>
  );
}

export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="option-btn" aria-pressed={active} onClick={onClick} style={{ padding: '9px 15px', borderRadius: 10, fontWeight: 600, fontSize: 13.5, color: active ? 'var(--text)' : 'var(--text-2)' }}>
      {children}
    </button>
  );
}

export function Pills({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>{children}</div>;
}

export function PhotoInput({ data, busy, onFile, size = 84, label }: { data: Photo | undefined; busy: boolean; onFile: (file: File) => void; size?: number; label: string }) {
  const { t } = usePrefs();
  const warn = data && (data.lowRes || data.blurry || data.tooDark || data.tooBright);
  const src = usePhotoUrls([data], true)(data);
  return (
    <label
      style={{
        position: 'relative',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: 12,
        border: data ? `1.5px solid ${warn ? 'var(--warn)' : 'var(--accent)'}` : '1.5px dashed rgba(255,255,255,0.2)',
        background: src ? `url(${src}) center/cover` : 'var(--sunken)',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
    >
      {/* No capture attribute: phones offer camera *and* photo library. */}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={data ? `${t('as.photo.replace')}: ${label}` : label}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
      {!data && !busy && <span aria-hidden="true" style={{ fontSize: 22, color: 'var(--faint)' }}>+</span>}
      {busy && <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>…</span>}
      {data && !busy && (
        <span aria-hidden="true" title={t('as.photo.replace')} style={{ position: 'absolute', right: 6, bottom: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(10,12,11,0.78)', border: '1px solid rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center', color: '#F2F4F1' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />
          </svg>
        </span>
      )}
    </label>
  );
}

export function PhotoSlot({ spec, data, busy, onFile, onRemove }: { spec: { key: string; label: string; hint?: string }; data: Photo | undefined; busy: boolean; onFile: (f: File) => void; onRemove: () => void }) {
  const { t } = usePrefs();
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 14, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <PhotoInput data={data} busy={busy} onFile={onFile} label={spec.label} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{spec.label}</div>
        {spec.hint && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{spec.hint}</div>}
        {data && (
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge--accent">{t('as.p.uploaded')}</span>
            {data.lowRes && <span className="badge badge--warn">{t('as.p.lowRes')}</span>}
            {data.blurry && <span className="badge badge--warn">{t('as.p.blurry')}</span>}
            {data.tooDark && <span className="badge badge--warn">{t('as.p.dark')}</span>}
            {data.tooBright && <span className="badge badge--warn">{t('as.p.bright')}</span>}
            <button type="button" className="link-btn link-btn--muted" onClick={onRemove} style={{ fontSize: 11, textDecoration: 'underline' }}>
              {t('as.p.retake')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
