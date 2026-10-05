// The designed replacement for window.confirm: `await confirm({...})`
// resolves true/false from an accessible Dialog. One provider at the root;
// only one confirmation can be open at a time.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button.tsx';
import { Dialog } from './Dialog.tsx';
import { usePrefs } from '../lib/prefs.tsx';

export type ConfirmOptions = {
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for irreversible actions (deleting, refunding, revoking). */
  tone?: 'danger' | 'primary';
};

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const { t } = usePrefs();
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    resolver.current?.(false);
    setOpts(o);
    return new Promise<boolean>((resolve) => (resolver.current = resolve));
  }, []);

  const settle = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onClose={() => settle(false)} title={opts?.title ?? ''} width={440}>
        {opts?.body && <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{opts.body}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Button variant="ghost" onClick={() => settle(false)} style={{ flex: 1 }}>
            {opts?.cancelLabel ?? t('confirm.cancelLabel')}
          </Button>
          <Button variant={opts?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)} style={{ flex: 1.4 }}>
            {opts?.confirmLabel ?? t('confirm.confirmLabel')}
          </Button>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm needs <ConfirmProvider>');
  return ctx;
}
