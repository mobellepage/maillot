import type { ChangeEvent, ReactNode } from 'react';
import type { Photo } from '../../../types/domain.ts';

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
  const warn = data && (data.lowRes || data.blurry);
  return (
    <label
      style={{
        position: 'relative',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: 12,
        border: data ? `1.5px solid ${warn ? 'var(--warn)' : 'var(--accent)'}` : '1.5px dashed rgba(255,255,255,0.2)',
        background: data ? `url(${data.dataUrl}) center/cover` : 'var(--sunken)',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
    >
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label={label}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
      {!data && !busy && <span aria-hidden="true" style={{ fontSize: 22, color: 'var(--faint)' }}>+</span>}
      {busy && <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>…</span>}
    </label>
  );
}

export function PhotoSlot({ spec, data, busy, onFile, onRemove }: { spec: { key: string; label: string; hint?: string }; data: Photo | undefined; busy: boolean; onFile: (f: File) => void; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 14, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <PhotoInput data={data} busy={busy} onFile={onFile} label={spec.label} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{spec.label}</div>
        {spec.hint && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{spec.hint}</div>}
        {data && (
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge--accent">✓ Hochgeladen</span>
            {data.lowRes && <span className="badge badge--warn">Niedrige Auflösung</span>}
            {data.blurry && <span className="badge badge--warn">Evtl. unscharf</span>}
            <button type="button" className="link-btn link-btn--muted" onClick={onRemove} style={{ fontSize: 11, textDecoration: 'underline' }}>
              Neu aufnehmen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
