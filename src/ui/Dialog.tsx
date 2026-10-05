// Accessible modal dialog: role="dialog" + aria-modal, labelled by its title,
// closes on Escape and backdrop click, traps Tab focus inside, and returns
// focus to whatever opened it. Bottom sheet on small screens. Rendered in a
// portal on <body> so transformed/animated ancestors can't trap or clip it.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons.tsx';
import { usePrefs } from '../lib/prefs.tsx';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onClose, title, children, width = 480 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number }) {
  const titleId = useId();
  const { t } = usePrefs();
  const panel = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the open/close effect on every render
  // (that would steal focus from whatever field the user is typing in).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first || panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--scrim)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0px, 3vw, 24px)',
        animation: 'kvIn .25s ease both'
      }}
      className="dialog-backdrop"
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog-panel"
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '92vh',
          overflow: 'auto',
          background: 'var(--surface-2)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          outline: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <h2 id={titleId} className="display" style={{ fontSize: 22, fontStretch: '82%' }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label={t('dialog.close')}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
