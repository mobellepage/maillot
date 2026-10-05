// The order book (bids & asks). Matching runs server-side in the insert trigger.
import { supabase } from '../supabase.ts';
import type { Ask, Bid, OrderBook, OrderRef } from './types.ts';

// ---------------------------------------------------------------------------
// Order book: bids & asks. Matching happens server-side in the insert
// trigger (match_order_book), so an insert may already have filled.
// ---------------------------------------------------------------------------
export async function placeBid(userId: string, shirtId: string, size: string, amount: number, expiresAt?: string | null): Promise<Bid> {
  const { data, error } = await supabase.from('bids').insert({ user_id: userId, shirt_id: shirtId, size, amount, expires_at: expiresAt ?? null }).select().single();
  if (error) throw error;
  return data;
}

export interface AskInput {
  shirtId?: string | null;
  customItemId?: string | null;
  size: string;
  amount: number;
  condition?: string;
  edition?: string;
  playerPrint?: string;
}

export async function placeAsk(userId: string, a: AskInput): Promise<Ask> {
  const { data, error } = await supabase
    .from('asks')
    .insert({
      user_id: userId,
      shirt_id: a.shirtId || null,
      custom_item_id: a.customItemId || null,
      size: a.size,
      amount: a.amount,
      condition: a.condition || null,
      edition: a.edition || null,
      player_print: a.playerPrint || null
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findOrderForAsk(askId: string): Promise<OrderRef | null> {
  const { data, error } = await supabase.from('orders').select('id,amount,status').eq('ask_id', askId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findOrderForBid(bidId: string): Promise<OrderRef | null> {
  const { data, error } = await supabase.from('orders').select('id,amount,status').eq('bid_id', bidId).maybeSingle();
  if (error) throw error;
  return data;
}

// Expired bids are excluded: the matcher ignores them, so showing one as
// "highest bid" would advertise a price nobody can actually sell at.
export async function loadOrderBook(shirtId: string, size: string): Promise<OrderBook> {
  const now = new Date().toISOString();
  const [{ data: bids, error: be }, { data: asks, error: ae }] = await Promise.all([
    supabase
      .from('bids')
      .select('*')
      .eq('shirt_id', shirtId)
      .eq('size', size)
      .eq('status', 'open')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('amount', { ascending: false }),
    supabase.from('asks').select('*').eq('shirt_id', shirtId).eq('size', size).eq('status', 'open').order('amount', { ascending: true })
  ]);
  if (be) throw be;
  if (ae) throw ae;
  return { bids: bids || [], asks: asks || [] };
}

