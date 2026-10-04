// Real Supabase Auth (email + password) — replaces the old "everything is
// anonymous, single-device localStorage" model. Session is persisted by
// supabase-js itself (localStorage-backed refresh token), so reloads keep you
// signed in; this hook just mirrors the current session into React state.
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';

export interface AuthResult {
  user: User | null;
  error: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? data.session.user : null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? session.user : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { user: data ? data.user : null, error: error ? error.message : null };
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data ? data.user : null, error: error ? error.message : null };
  };

  const signOut = () => supabase.auth.signOut();

  return { user, authLoading, signUp, signIn, signOut };
}
