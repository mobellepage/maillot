// Links from sign-up and password emails can come back with an error in the
// URL fragment (#error=access_denied&error_code=otp_expired…) — expired or
// already used. Say so in the reader's language and tidy the address bar.
import { useEffect } from 'react';
import { usePrefs } from '../lib/prefs.tsx';
import { useToast } from '../lib/toast.tsx';
import { authLinkError } from '../lib/authLink.ts';

export function AuthLinkNotice() {
  const { t } = usePrefs();
  const toast = useToast();
  useEffect(() => {
    const kind = authLinkError(window.location.hash);
    if (!kind) return;
    toast(t(kind === 'expired' ? 'auth.linkExpired' : 'auth.linkFailed'));
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [t, toast]);
  return null;
}
