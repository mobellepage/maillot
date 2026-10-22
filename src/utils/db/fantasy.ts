// Fantasy: the player's state, packs, cards, Kit Points and missions. The
// game runs in the database; the app only asks and reports.
import { sb } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';

export type FantasyState = RpcReturns<'fantasy_state'>[number];
export type FantasyMission = { key: string; points: number; how: 'server' | 'client'; done: boolean };
export type PackCard = RpcReturns<'fantasy_open_pack'>[number];
export type FantasyCard = RpcReturns<'fantasy_my_cards'>[number];
export type GoldTodo = RpcReturns<'fantasy_gold_todo'>[number];
export type FantasyOdds = RpcReturns<'fantasy_odds'>[number];

export async function loadFantasyState(): Promise<FantasyState> {
  const { data, error } = await (await sb()).rpc('fantasy_state');
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('no state');
  return row;
}

/** Opens a pack (an extra one, paid with Kit Points, when `extra`). Errors: P0460 daily limit, P0461 not enough points, P0462 no pack. */
export async function openFantasyPack(extra = false): Promise<PackCard[]> {
  const { data, error } = await (await sb()).rpc('fantasy_open_pack', { p_extra: extra });
  if (error) throw error;
  return data ?? [];
}

/** Duplicates (all, or one kit's) become Kit Points; returns how many. */
export async function convertFantasyDuplicates(kitId?: string): Promise<number> {
  const { data, error } = await (await sb()).rpc('fantasy_convert_duplicates', { p_kit: kitId ?? null });
  if (error) throw error;
  return data ?? 0;
}

/** The app noticed a mission being done (a value checked, a club page opened …). */
export async function fantasyEvent(key: string): Promise<number> {
  const { data, error } = await (await sb()).rpc('fantasy_event', { p_key: key });
  if (error) throw error;
  return data ?? 0;
}

export async function loadFantasyCards(): Promise<FantasyCard[]> {
  const { data, error } = await (await sb()).rpc('fantasy_my_cards');
  if (error) throw error;
  return data ?? [];
}

export async function loadGoldTodo(): Promise<GoldTodo[]> {
  const { data, error } = await (await sb()).rpc('fantasy_gold_todo');
  if (error) throw error;
  return data ?? [];
}

export async function loadFantasyOdds(): Promise<FantasyOdds[]> {
  const { data, error } = await (await sb()).rpc('fantasy_odds');
  if (error) throw error;
  return data ?? [];
}
