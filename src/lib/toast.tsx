// App-wide toast: one short message at a time, announced to screen readers.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const ToastContext = createContext<((msg: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  // The toast slides out before it's removed (the animation's end removes it).
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((m: string) => {
    clearTimeout(timer.current);
    setMsg(m);
    setLeaving(false);
    timer.current = setTimeout(() => setLeaving(true), 3200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" style={{ position: 'fixed', left: '50%', bottom: 'calc(32px + var(--mobile-nav, 0px))', transform: 'translateX(-50%)', zIndex: 120, pointerEvents: 'none' }}>
        {msg && (
          <div
            key={msg}
            onAnimationEnd={() => leaving && setMsg(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 18px',
              borderRadius: 999,
              background: 'var(--text)',
              color: 'var(--bg)',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              animation: leaving ? 'kvOut .2s ease both' : 'kvIn .3s var(--ease-spring) both',
              maxWidth: 'calc(100vw - 32px)'
            }}
          >
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />
            {msg}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export function useToast(): (msg: string) => void {
  const t = useContext(ToastContext);
  if (!t) throw new Error('useToast outside ToastProvider');
  return t;
}
