// Notifications, behaviour events, public stats and API keys.
import { supabase } from '../supabase.ts';
import type { RpcReturns, Tables } from '../../types/database.ts';
import type { EventType } from '../../types/domain.ts';
import type { ApiKeyRow, Notification } from './types.ts';

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function loadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Behaviour events (feed trending + recommendations)
// ---------------------------------------------------------------------------
export async function logEvent(userId: string | null, shirtId: string, type: EventType): Promise<void> {
  const { error } = await supabase.from('events').insert({ user_id: userId, shirt_id: shirtId, type });
  if (error) throw error; // callers swallow — events must never block UI
}

export async function loadRecentEvents(sinceIso: string): Promise<Pick<Tables<'events'>, 'shirt_id' | 'type' | 'created_at'>[]> {
  const { data, error } = await supabase.from('events').select('shirt_id,type,created_at').gte('created_at', sinceIso).limit(5000);
  if (error) throw error;
  return data || [];
}

// Site-wide trending: aggregated server-side across all users (the events
// table's RLS only lets a client read its own rows).
export async function loadTrendingScores(days = 14): Promise<RpcReturns<'trending_scores'>> {
  const { data, error } = await supabase.rpc('trending_scores', { days });
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Public market statistics (aggregates only — see migration public_market_stats)
// ---------------------------------------------------------------------------
export type PublicStats = RpcReturns<'public_stats'>[number];
export type ShirtStats = RpcReturns<'shirt_stats'>[number];

export async function loadPublicStats(): Promise<PublicStats | null> {
  const { data, error } = await supabase.rpc('public_stats');
  if (error) throw error;
  return (data || [])[0] || null;
}

export async function loadShirtStats(shirtId: string): Promise<ShirtStats | null> {
  const { data, error } = await supabase.rpc('shirt_stats', { p_shirt_id: shirtId });
  if (error) throw error;
  return (data || [])[0] || null;
}

// ---------------------------------------------------------------------------
// Licensable price-index API: admin-only key management (RLS + the RPCs
// re-check is_admin server-side).
// ---------------------------------------------------------------------------
export async function loadApiKeys(): Promise<ApiKeyRow[]> {
  const { data, error } = await supabase.from('api_keys').select('id,label,key_prefix,created_at,revoked_at,last_used_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// plaintext_key is only ever available in this one response; only the hash is stored.
export async function createApiKey(label: string): Promise<RpcReturns<'create_api_key'>[number] | null> {
  const { data, error } = await supabase.rpc('create_api_key', { p_label: label });
  if (error) throw error;
  return (data || [])[0] || null;
}

export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_api_key', { p_id: id });
  if (error) throw error;
}
