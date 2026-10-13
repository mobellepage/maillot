// The kit library: clubs, their kits by season, members' suggestions and
// the admin queue / import.
import { sb } from '../supabase.ts';
import type { Json, RpcReturns, Tables } from '../../types/database.ts';

export type KitClub = Tables<'kit_clubs'>;
export type Kit = Tables<'kits'>;

export async function loadKitClubs(): Promise<KitClub[]> {
  const { data, error } = await (await sb()).from('kit_clubs').select('*').order('name');
  if (error) throw error;
  return data || [];
}

/** How many kits each club has in the library. */
export async function loadKitCounts(): Promise<Record<string, number>> {
  const { data, error } = await (await sb()).from('kits').select('club_id').eq('status', 'approved').limit(20000);
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of data || []) out[r.club_id] = (out[r.club_id] ?? 0) + 1;
  return out;
}

export async function loadClubKits(clubId: string): Promise<Kit[]> {
  const { data, error } = await (await sb()).from('kits').select('*').eq('club_id', clubId).eq('status', 'approved').order('season_year', { ascending: false });
  if (error) throw error;
  return data || [];
}

export interface KitSuggestion {
  club: string;
  season: string;
  kind: string;
  brand: string;
  sponsor: string;
  pattern: string;
  colors: string[];
  note: string;
}

export async function suggestKit(k: KitSuggestion): Promise<void> {
  const { error } = await (await sb()).rpc('suggest_kit', { p_club: k.club, p_season: k.season, p_kind: k.kind, p_brand: k.brand, p_sponsor: k.sponsor, p_pattern: k.pattern, p_colors: k.colors, p_note: k.note });
  if (error) throw error;
}

export type KitSuggestionRow = RpcReturns<'list_kit_suggestions_for_admin'>[number];

export async function loadKitSuggestions(): Promise<KitSuggestionRow[]> {
  const { data, error } = await (await sb()).rpc('list_kit_suggestions_for_admin');
  if (error) throw error;
  return data || [];
}

export async function reviewKit(id: string, approve: boolean): Promise<void> {
  const { error } = await (await sb()).rpc('admin_review_kit', { p_id: id, p_approve: approve });
  if (error) throw error;
}

export async function importKits(kits: Json): Promise<number> {
  const { data, error } = await (await sb()).rpc('admin_import_kits', { p_kits: kits });
  if (error) throw error;
  return data ?? 0;
}
