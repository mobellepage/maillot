// "Continue with Apple / Google" (Supabase OAuth). Shown only for providers
// switched on (AUTH_PROVIDERS in config/site.ts) and not inside the native
// app, which would need its own deep-link return. New members land on
// /welcome like everyone else (useOnboardingRedirect).
import { useState } from 'react';
import { AUTH_PROVIDERS, SITE_URL } from '../../config/site.ts';
import { isNative } from '../../lib/native.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { sb } from '../../utils/supabase.ts';
import { Notice } from '../../ui/index.ts';

const APPLE = 'M16.37 12.62c-.02-2.3 1.88-3.41 1.97-3.46-1.07-1.57-2.74-1.79-3.33-1.81-1.42-.14-2.77.84-3.49.84-.72 0-1.83-.82-3.01-.8-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.59-.75 2.99-.75 1.4 0 1.79.75 3.01.72 1.24-.02 2.03-1.13 2.79-2.25.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.42-.93-2.45-3.7zM14.08 5.84c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.68-1.11 1.78-.97 2.83 1.02.08 2.07-.52 2.71-1.29z';

export function SocialSignIn({ next }: { next?: string | undefined }) {
  const { t } = usePrefs();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  if (!AUTH_PROVIDERS.length || isNative()) return null;

  const go = async (provider: 'apple' | 'google') => {
    setBusy(provider);
    setError(false);
    const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
    const { error: err } = await (await sb()).auth.signInWithOAuth({ provider, options: { redirectTo: origin + (next && next.startsWith('/') ? next : '/vault') } });
    if (err) {
      setBusy(null);
      setError(true);
    }
  };

  return (
    <div style={{ marginTop: 22 }}>
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)', fontSize: 12.5, margin: '0 0 14px' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        {t('auth.or')}
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {AUTH_PROVIDERS.includes('apple') && (
          <button type="button" className="social-btn social-btn--apple" onClick={() => go('apple')} disabled={!!busy}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d={APPLE} fill="currentColor" />
            </svg>
            {t('auth.withApple')}
          </button>
        )}
        {AUTH_PROVIDERS.includes('google') && (
          <button type="button" className="social-btn social-btn--google" onClick={() => go('google')} disabled={!!busy}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {t('auth.withGoogle')}
          </button>
        )}
      </div>
      {error && (
        <Notice tone="neg" style={{ marginTop: 12 }}>
          {t('auth.socialFailed')}
        </Notice>
      )}
    </div>
  );
}
