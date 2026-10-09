// Notifications, behaviour events, public stats and API keys.
import { sb } from '../supabase.ts';
import type { RpcReturns, Tables } from '../../types/database.ts';
import type { EventType } from '../../types/domain.ts';
import type { ApiKeyRow, Notification } from './types.ts';

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function loadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await (await sb()).from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await (await sb()).from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Behaviour events (feed trending + recommendations)
// ---------------------------------------------------------------------------
export async function logEvent(userId: string | null, shirtId: string, type: EventType): Promise<void> {
  const { error } = await (await sb()).from('events').insert({ user_id: userId, shirt_id: shirtId, type });
  if (error) throw error; // callers swallow — events must never block UI
}

export async function loadRecentEvents(sinceIso: string): Promise<Pick<Tables<'events'>, 'shirt_id' | 'type' | 'created_at'>[]> {
  const { data, error } = await (await sb()).from('events').select('shirt_id,type,created_at').gte('created_at', sinceIso).limit(5000);
  if (error) throw error;
  return data || [];
}

// Site-wide trending: aggregated server-side across all users (the events
// table's RLS only lets a client read its own rows).
export async function loadTrendingScores(days = 14): Promise<RpcReturns<'trending_scores'>> {
  const { data, error } = await (await sb()).rpc('trending_scores', { days });
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Public market statistics (aggregates only — see migration public_market_stats)
// ---------------------------------------------------------------------------
export type PublicStats = RpcReturns<'public_stats'>[number];
export type ShirtStats = RpcReturns<'shirt_stats'>[number];

export async function loadPublicStats(): Promise<PublicStats | null> {
  const { data, error } = await (await sb()).rpc('public_stats');
  if (error) throw error;
  return (data || [])[0] || null;
}

export async function loadShirtStats(shirtId: string): Promise<ShirtStats | null> {
  const { data, error } = await (await sb()).rpc('shirt_stats', { p_shirt_id: shirtId });
  if (error) throw error;
  return (data || [])[0] || null;
}

// ---------------------------------------------------------------------------
// Licensable price-index API: admin-only key management (RLS + the RPCs
// re-check is_admin server-side).
// ---------------------------------------------------------------------------
export async function loadApiKeys(): Promise<ApiKeyRow[]> {
  const { data, error } = await (await sb()).from('api_keys').select('id,label,key_prefix,created_at,revoked_at,last_used_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// plaintext_key is only ever available in this one response; only the hash is stored.
export async function createApiKey(label: string): Promise<RpcReturns<'create_api_key'>[number] | null> {
  const { data, error } = await (await sb()).rpc('create_api_key', { p_label: label });
  if (error) throw error;
  return (data || [])[0] || null;
}

export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await (await sb()).rpc('revoke_api_key', { p_id: id });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Profile / onboarding
// ---------------------------------------------------------------------------
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const { data, error } = await (await sb()).rpc('handle_available', { p_handle: handle });
  if (error) throw error;
  return !!data;
}

export async function saveOnboarding(userId: string, answers: { goals: string[]; interests: { leagues: string[]; types: string[] }; handle?: string | null }): Promise<void> {
  const patch: { goals: string[]; interests: { leagues: string[]; types: string[] }; onboarded_at: string; handle?: string } = { goals: answers.goals, interests: answers.interests, onboarded_at: new Date().toISOString() };
  if (answers.handle) patch.handle = answers.handle;
  const { error } = await (await sb()).from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

/** Show (or hide) the total value of the shirts the member shows on their public profile. */
export async function setShowCollectionValue(userId: string, show: boolean): Promise<void> {
  const { error } = await (await sb()).from('profiles').update({ show_collection_value: show }).eq('id', userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Operations health (admins)
// ---------------------------------------------------------------------------
export type Health = RpcReturns<'admin_health'>[number];
export type ErrorGroup = RpcReturns<'admin_recent_errors'>[number];

export async function loadHealth(): Promise<Health | null> {
  const { data, error } = await (await sb()).rpc('admin_health');
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function loadRecentErrors(): Promise<ErrorGroup[]> {
  const { data, error } = await (await sb()).rpc('admin_recent_errors');
  if (error) throw error;
  return data ?? [];
}

export type AuditEntry = Tables<'audit_log'>;

/** Most recent admin actions (RLS: admins with a verified second factor only). */
export async function loadAuditLog(): Promise<AuditEntry[]> {
  const { data, error } = await (await sb()).from('audit_log').select('*').order('at', { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}
