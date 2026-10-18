// Premium (unlimited shirts): Stripe subscription via the "premium" edge
// function. { configured: false } means payments aren't switched on yet.
import { sb } from '../supabase.ts';
import { isNative } from '../../lib/native.ts';
import type { PremiumInterval } from '../../config/plans.ts';

export type PremiumResult = { configured: false } | { configured: true; url?: string; already?: boolean; error?: string };

async function call(body: Record<string, unknown>): Promise<PremiumResult> {
  const { data, error } = await (await sb()).functions.invoke<PremiumResult>('premium', { body: { ...body, app: isNative() } });
  if (error) throw error;
  if (!data) throw new Error('empty premium response');
  return data;
}

export const startPremiumCheckout = (interval: PremiumInterval) => call({ action: 'checkout', interval });
export const openPremiumPortal = () => call({ action: 'portal' });

/** "Tell me when Premium starts" (while payments are off). */
export async function joinPremiumWaitlist(): Promise<void> {
  const { error } = await (await sb()).rpc('join_premium_waitlist');
  if (error) throw error;
}

/** The database stops an 11th shirt on the free plan with this code. */
export const isPlanLimitError = (e: unknown): boolean => !!e && typeof e === 'object' && (e as { code?: string }).code === 'P0402';

/** My collector points (shirts bought through Maillot). */
export async function loadMyPoints(): Promise<{ total: number; purchases: number }> {
  const { data, error } = await (await sb()).rpc('my_collector_points');
  if (error) throw error;
  return data?.[0] ?? { total: 0, purchases: 0 };
}
