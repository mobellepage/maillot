// Typed Supabase client (project "maillot", eu-central-2). Every query and
// RPC call is checked against the generated schema in types/database.ts.
//
// The client library is ~60 kB gzipped, and the first paint doesn't need it
// (the catalogue ships with the app), so it's loaded on first use: call
// `await sb()` instead of importing a client.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.ts';

export type Client = SupabaseClient<Database>;

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let client: Promise<Client> | null = null;

export function sb(): Promise<Client> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient<Database>(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }));
  return client;
}
