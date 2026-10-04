// Typed Supabase client (project "maillot", eu-central-2). Every query and
// RPC call is checked against the generated schema in types/database.ts.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.ts';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});
