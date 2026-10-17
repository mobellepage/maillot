// The kit designer's saved designs.
import { sb } from '../supabase.ts';
import type { Json } from '../../types/database.ts';

export interface SavedDesign {
  id: string;
  name: string;
  design: unknown;
  shared: boolean;
  updated_at: string;
}

export interface SharedDesign {
  id: string;
  name: string;
  design: unknown;
  handle: string | null;
  avatar: string | null;
  created_at: string;
  is_mine: boolean;
}

export async function loadMyDesigns(): Promise<SavedDesign[]> {
  const { data, error } = await (await sb()).from('kit_designs').select('id, name, design, shared, updated_at').order('updated_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

/** Saves a new design (no id) or changes one of mine; returns its id. */
export async function saveDesign(d: { id?: string | undefined; name: string; design: unknown; shared: boolean }): Promise<string> {
  const client = await sb();
  const row = { name: d.name, design: d.design as Json, shared: d.shared };
  const { data, error } = d.id ? await client.from('kit_designs').update(row).eq('id', d.id).select('id').single() : await client.from('kit_designs').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function deleteDesign(id: string): Promise<void> {
  const { error } = await (await sb()).from('kit_designs').delete().eq('id', id);
  if (error) throw error;
}

export async function loadSharedDesign(id: string): Promise<SharedDesign | null> {
  const { data, error } = await (await sb()).rpc('shared_kit_design', { p_id: id });
  if (error) throw error;
  return data?.[0] ?? null;
}
