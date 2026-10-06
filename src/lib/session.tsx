// Who is signed in, and whether they're an admin. Wraps Supabase Auth so
// screens never touch the auth client directly.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { sb } from '../utils/supabase.ts';

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
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasStoredSession);
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    sb()
      .then(async (client) => {
        if (cancelled) return;
        const { data: sub } = client.auth.onAuthStateChange((_event, session) => setUser(session ? session.user : null));
        unsubscribe = () => sub.subscription.unsubscribe();
        const { data } = await client.auth.getSession();
        if (!cancelled) setUser(data.session ? data.session.user : null);
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
    isAdmin: !!profile.data?.is_admin,
    profile: !user ? null : profile.data === undefined ? undefined : profile.data && { handle: profile.data.handle, goals: profile.data.goals ?? [], interests: (profile.data.interests ?? {}) as Profile['interests'], onboardedAt: profile.data.onboarded_at },
    signIn: async (email, password) => {
      const { error } = await (await sb()).auth.signInWithPassword({ email, password });
      return { error: error ? error.message : null };
    },
    signUp: async (email, password) => {
      const { data, error } = await (await sb()).auth.signUp({ email, password });
      return { error: error ? error.message : null, signedIn: !!data.session };
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
