// "Trotzdem anfragen": non-binding interest in a collector's piece (a shirt
// shown as not for sale). The owner answers, ignores it or opens the shirt to offers.
import { sb } from '../supabase.ts';
import type { RpcReturns } from '../../types/database.ts';

export type Inquiry = RpcReturns<'my_inquiries'>[number];

export async function makeInquiry(itemId: string, amount: number | null, message: string): Promise<void> {
  const { error } = await (await sb()).rpc('make_inquiry', { p_item_id: itemId, p_amount: amount, p_message: message.trim() || null });
  if (error) throw error;
}

export async function answerInquiry(id: string, reply: string): Promise<void> {
  const { error } = await (await sb()).rpc('answer_inquiry', { p_id: id, p_reply: reply });
  if (error) throw error;
}

export async function dismissInquiry(id: string): Promise<void> {
  const { error } = await (await sb()).rpc('dismiss_inquiry', { p_id: id });
  if (error) throw error;
}

export async function loadMyInquiries(): Promise<Inquiry[]> {
  const { data, error } = await (await sb()).rpc('my_inquiries');
  if (error) throw error;
  return data ?? [];
}

/** Owners decide per shirt whether others may ask about it. */
export async function setInquiriesEnabled(itemId: string, on: boolean): Promise<void> {
  const { error } = await (await sb()).from('custom_items').update({ inquiries_enabled: on }).eq('id', itemId);
  if (error) throw error;
}
