// Offers on collection shirts (shown as "open to offers" or "for sale").
// Accepting one creates a normal order the buyer pays into escrow.
import { sb } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';

export type CollectionOffer = RpcReturns<'my_collection_offers'>[number];

export async function makeOffer(itemId: string, amount: number, message: string): Promise<void> {
  const { error } = await (await sb()).rpc('make_collection_offer', { p_item_id: itemId, p_amount: amount, p_message: message.trim() || null });
  if (error) throw error;
}

/** Accept (returns the new order's id) or decline an offer on one of your shirts. */
export async function respondToOffer(offerId: string, accept: boolean): Promise<string | null> {
  const { data, error } = await (await sb()).rpc('respond_collection_offer', { p_offer_id: offerId, p_accept: accept });
  if (error) throw error;
  return data ?? null;
}

export async function withdrawOffer(offerId: string): Promise<void> {
  const { error } = await (await sb()).rpc('withdraw_collection_offer', { p_offer_id: offerId });
  if (error) throw error;
}

export async function loadMyOffers(): Promise<CollectionOffer[]> {
  const { data, error } = await (await sb()).rpc('my_collection_offers');
  if (error) throw error;
  return data ?? [];
}
