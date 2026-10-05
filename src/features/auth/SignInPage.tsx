import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { Button, Notice, TextField } from '../../ui/index.ts';

export default function SignInPage() {
  const { t } = usePrefs();
  const { signIn, signUp } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const state = (useLocation().state || {}) as { from?: string; notice?: string };
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signingIn = mode === 'signin';
  usePageMeta(signingIn ? t('auth.signin') : t('auth.createAccount'));

  const submit = async () => {
    if (!email || !password) return setError(t('auth.required'));
    setBusy(true);
    setError(null);
    const { error: err, signedIn } = await (signingIn ? signIn : signUp)(email, password);
    setBusy(false);
    if (err) return setError(err);
    setPassword('');
    if (signingIn) {
      toast(t('toast.signedIn'));
      navigate(state.from || '/vault', { replace: true });
    } else if (signedIn) {
      navigate('/welcome', { replace: true, state: { from: state.from } });
    } else {
      toast(t('toast.accountCreated'));
      setMode('signin');
    }
  };

  return (
    <main id="main" style={{ maxWidth: 420, margin: '0 auto', padding: 'clamp(40px,8vw,80px) var(--gutter) 100px', animation: 'kvIn .4s ease both' }}>
      <div className="eyebrow">{t('auth.account')}</div>
      <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(26px,4vw,34px)', lineHeight: 1 }}>
        {signingIn ? t('auth.signin') : t('auth.createAccount')}
      </h1>
      {state.notice && (
        <Notice tone="info" style={{ marginTop: 16 }}>
          {t(state.notice)}
        </Notice>
      )}
      {error && (
        <Notice tone="neg" style={{ marginTop: 16 }}>
          {error}
        </Notice>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}
      >
        <TextField label={t('auth.email')} type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <TextField
          label={t('auth.password')}
          type="password"
          name="password"
          autoComplete={signingIn ? 'current-password' : 'new-password'}
          minLength={signingIn ? undefined : 8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          hint={signingIn ? undefined : t('auth.minLength')}
        />
        <Button type="submit" block busy={busy} busyLabel={t('auth.pleaseWait')} style={{ marginTop: 8 }}>
          {signingIn ? t('auth.signin') : t('auth.createAccount')}
        </Button>
        <button type="button" className="link-btn link-btn--muted" onClick={() => (setMode(signingIn ? 'signup' : 'signin'), setError(null))} style={{ fontSize: 13 }}>
          {signingIn ? t('auth.noAccount') : t('auth.haveAccount')}
        </button>
      </form>
      <Link to="/" className="btn btn--ghost btn--sm" style={{ marginTop: 32 }}>
        {t('auth.back')}
      </Link>
    </main>
  );
}
