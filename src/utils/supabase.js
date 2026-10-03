// Real Supabase client — talks to a genuinely provisioned Postgres + Auth backend
// (project "maillot", eu-central-2). Replaces the localStorage-only persistence
// used everywhere else in the app before Phase 6.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});
