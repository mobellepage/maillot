import { useRef, useState } from 'react';
import { Captcha, CAPTCHA_SITE_KEY, type CaptchaHandle } from './Captcha.tsx';
import { Link, useLocation, useNavigate } from 'react-router';
import { usePageMeta } from '../../lib/meta.ts';
import { usePrefs } from '../../lib/prefs.tsx';
import { useSession } from '../../lib/session.tsx';
import { useToast } from '../../lib/toast.tsx';
import { Button, Notice, TextField } from '../../ui/index.ts';

export default function SignInPage() {
  const { t, lang } = usePrefs();
  const { signIn, signUp, requestPasswordReset } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const state = (useLocation().state || {}) as { from?: string; notice?: string };
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  /** After sign-up or a reset request: which address the email went to. */
  const [sentTo, setSentTo] = useState<{ email: string; kind: 'confirm' | 'reset' } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);
  const signingIn = mode === 'signin';
  const resetting = mode === 'reset';
  const title = resetting ? t('auth.resetTitle') : signingIn ? t('auth.signin') : t('auth.createAccount');
  usePageMeta(title);
  const switchTo = (m: typeof mode) => {
    setMode(m);
    setError(null);
  };

  const submit = async () => {
    if (resetting) {
      if (!email) return setError(t('auth.emailRequired'));
      if (CAPTCHA_SITE_KEY && !captcha) return setError(t('auth.captcha'));
      setBusy(true);
      setError(null);
      const { error: err } = await requestPasswordReset(email, captcha ?? undefined);
      setBusy(false);
      setCaptcha(null);
      captchaRef.current?.reset();
      if (err) return setError(err);
      return setSentTo({ email, kind: 'reset' });
    }
    if (!email || !password) return setError(t('auth.required'));
    if (CAPTCHA_SITE_KEY && !captcha) return setError(t('auth.captcha'));
    setBusy(true);
    setError(null);
    const { error: err, signedIn } = signingIn ? await signIn(email, password, captcha ?? undefined) : await signUp(email, password, captcha ?? undefined, lang);
    setBusy(false);
    // Tokens are single-use: get a fresh one for the next attempt.
    setCaptcha(null);
    captchaRef.current?.reset();
    if (err) return setError(err);
    setPassword('');
    if (signingIn) {
      toast(t('toast.signedIn'));
      navigate(state.from || '/vault', { replace: true });
    } else if (signedIn) {
      navigate('/welcome', { replace: true, state: { from: state.from } });
    } else {
      // Email confirmation is on: say clearly what happens next.
      setSentTo({ email, kind: 'confirm' });
    }
  };

  if (sentTo) {
    return (
      <main id="main" style={{ maxWidth: 420, margin: '0 auto', padding: 'clamp(40px,8vw,80px) var(--gutter) 100px', animation: 'kvIn .4s ease both' }}>
        <div className="eyebrow">{t('auth.account')}</div>
        <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(26px,4vw,34px)', lineHeight: 1 }}>
          {t('auth.checkInbox')}
        </h1>
        <p style={{ color: 'var(--text-2)', lineHeight: 1.6, marginTop: 16 }}>{t(sentTo.kind === 'confirm' ? 'auth.confirmSent' : 'auth.resetSent', { email: sentTo.email })}</p>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.55, marginTop: 12 }}>{t('auth.checkSpam')}</p>
        <Button
          variant="secondary"
          block
          style={{ marginTop: 24 }}
          onClick={() => {
            setSentTo(null);
            switchTo('signin');
          }}
        >
          {t('auth.toSignIn')}
        </Button>
      </main>
    );
  }

  return (
    <main id="main" style={{ maxWidth: 420, margin: '0 auto', padding: 'clamp(40px,8vw,80px) var(--gutter) 100px', animation: 'kvIn .4s ease both' }}>
      <div className="eyebrow">{t('auth.account')}</div>
      <h1 className="display" style={{ marginTop: 8, fontSize: 'clamp(26px,4vw,34px)', lineHeight: 1 }}>
        {title}
      </h1>
      {resetting && <p style={{ color: 'var(--text-2)', lineHeight: 1.55, marginTop: 12 }}>{t('auth.resetBody')}</p>}
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
        {!resetting && (
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
        )}
        {signingIn && (
          <button type="button" className="link-btn link-btn--muted" onClick={() => switchTo('reset')} style={{ fontSize: 13, alignSelf: 'flex-end', marginTop: -6 }}>
            {t('auth.forgot')}
          </button>
        )}
        <Captcha ref={captchaRef} onToken={setCaptcha} lang={lang} />
        <Button type="submit" block busy={busy} busyLabel={t('auth.pleaseWait')} style={{ marginTop: 8 }}>
          {resetting ? t('auth.sendLink') : signingIn ? t('auth.signin') : t('auth.createAccount')}
        </Button>
        <button type="button" className="link-btn link-btn--muted" onClick={() => switchTo(signingIn ? 'signup' : 'signin')} style={{ fontSize: 13 }}>
          {resetting ? t('auth.backToSignIn') : signingIn ? t('auth.noAccount') : t('auth.haveAccount')}
        </button>
      </form>
      <Link to="/" className="btn btn--ghost btn--sm" style={{ marginTop: 32 }}>
        {t('auth.back')}
      </Link>
    </main>
  );
}
