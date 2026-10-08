// Who is signed in, and whether they're an admin. Wraps Supabase Auth so
// screens never touch the auth client directly.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { sb } from '../utils/supabase.ts';
import { shareOrigin } from '../config/site.ts';

/** Is a Supabase session stored in this browser? Guests don't wait for the auth client. */
function hasStoredSession(): boolean {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  } catch {
    return false;
  }
}

export interface AuthResult {
  error: string | null;
  /** Sign-up only: true when no email confirmation is needed and the member is signed in. */
  signedIn?: boolean;
}

export interface Profile {
  handle: string | null;
  goals: string[];
  interests: { leagues?: string[]; types?: string[] };
  onboardedAt: string | null;
}

interface Session {
  user: User | null;
  /** The signed-in member's profile; undefined while it loads. */
  profile: Profile | null | undefined;
  /** true until the stored session has been read on first load */
  loading: boolean;
  /** Admin flag AND a session verified with the second factor — what the server checks. */
  isAdmin: boolean;
  /** The account has admin rights, whether or not the second factor is verified yet. */
  adminFlag: boolean;
  /** Assurance level of the current session: aal2 once a TOTP code was verified. */
  aal: 'aal1' | 'aal2' | null;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<AuthResult>;
  /** lang picks the language of the confirmation email (it reads user metadata). */
  signUp: (email: string, password: string, captchaToken?: string, lang?: string) => Promise<AuthResult>;
  /** Emails a link to /reset-password. */
  requestPasswordReset: (email: string, captchaToken?: string) => Promise<AuthResult>;
  /** Sets a new password for the signed-in (or just-recovered) account. */
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

/** Where links in sign-up and password emails lead: this site in a browser, the public website from the app. */
const authRedirect = (path: string) => shareOrigin() + path;

const SessionContext = createContext<Session | null>(null);

/** The `aal` claim of an access token (aal2 = second factor verified). */
function aalOf(token: string): 'aal1' | 'aal2' {
  try {
    const claims = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { aal?: string };
    return claims.aal === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return 'aal1';
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [aal, setAal] = useState<'aal1' | 'aal2' | null>(null);
  const [loading, setLoading] = useState(hasStoredSession);
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    sb()
      .then(async (client) => {
        if (cancelled) return;
        const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
          setUser(session ? session.user : null);
          setAal(session ? aalOf(session.access_token) : null);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
        const { data } = await client.auth.getSession();
        if (!cancelled) {
          setUser(data.session ? data.session.user : null);
          setAal(data.session ? aalOf(data.session.access_token) : null);
        }
      })
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const profile = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (await sb()).from('profiles').select('is_admin,handle,goals,interests,onboarded_at').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  const value: Session = {
    user,
    loading,
    isAdmin: !!profile.data?.is_admin && aal === 'aal2',
    adminFlag: !!profile.data?.is_admin,
    aal,
    profile: !user ? null : profile.data === undefined ? undefined : profile.data && { handle: profile.data.handle, goals: profile.data.goals ?? [], interests: (profile.data.interests ?? {}) as Profile['interests'], onboardedAt: profile.data.onboarded_at },
    signIn: async (email, password, captchaToken) => {
      const { error } = await (await sb()).auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : undefined });
      return { error: error ? error.message : null };
    },
    signUp: async (email, password, captchaToken, lang) => {
      const { data, error } = await (await sb()).auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirect('/welcome'), data: lang ? { lang } : undefined, ...(captchaToken ? { captchaToken } : {}) }
      });
      return { error: error ? error.message : null, signedIn: !!data.session };
    },
    requestPasswordReset: async (email, captchaToken) => {
      const { error } = await (await sb()).auth.resetPasswordForEmail(email, { redirectTo: authRedirect('/reset-password'), ...(captchaToken ? { captchaToken } : {}) });
      return { error: error ? error.message : null };
    },
    updatePassword: async (password) => {
      const { error } = await (await sb()).auth.updateUser({ password });
      return { error: error ? error.message : null };
    },
    signOut: async () => {
      await (await sb()).auth.signOut();
      qc.clear(); // never show the previous account's data to the next one
    }
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}
