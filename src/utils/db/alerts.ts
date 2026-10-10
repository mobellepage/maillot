// Listing alerts: "tell me when this shirt is listed (in my size, up to my
// price)". A database trigger notifies the member when a matching listing
// goes live (listing_alerts migration).
import { sb } from '../supabase.ts';
import type { Tables } from '../../types/database.ts';

export type ListingAlert = Tables<'listing_alerts'>;

export async function loadMyAlerts(): Promise<ListingAlert[]> {
  const { data, error } = await (await sb()).from('listing_alerts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** size null = any size; maxPrice null = any price. Replaces an existing alert for the same shirt and size. */
export async function setAlert(userId: string, shirtId: string, size: string | null, maxPrice: number | null): Promise<void> {
  const client = await sb();
  const del = client.from('listing_alerts').delete().eq('shirt_id', shirtId);
  const { error: delError } = await (size === null ? del.is('size', null) : del.eq('size', size));
  if (delError) throw delError;
  const { error } = await client.from('listing_alerts').insert({ user_id: userId, shirt_id: shirtId, size, max_price: maxPrice });
  if (error) throw error;
}

export async function removeAlert(id: string): Promise<void> {
  const { error } = await (await sb()).from('listing_alerts').delete().eq('id', id);
  if (error) throw error;
}
