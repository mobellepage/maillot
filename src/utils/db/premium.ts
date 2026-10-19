// Premium (unlimited AI scans, studio look, 6 % commission): Stripe
// subscription via the "premium" edge function. { configured: false } means
// payments aren't switched on yet.
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

export type MyPlan = { plan: 'free' | 'trial' | 'premium'; trialUntil: string | null; premiumUntil: string | null; scansUsed: number; scansLimit: number; scansReset: string | null };

/** My plan and this month's AI scans (public.my_plan). */
export async function loadMyPlan(): Promise<MyPlan | null> {
  const { data, error } = await (await sb()).rpc('my_plan');
  if (error) throw error;
  const r = data?.[0];
  return r ? { plan: r.plan, trialUntil: r.trial_until, premiumUntil: r.premium_until, scansUsed: r.scans_used, scansLimit: r.scans_limit, scansReset: r.scans_reset } : null;
}

/** My collector points (shirts bought through Maillot). */
export async function loadMyPoints(): Promise<{ total: number; purchases: number }> {
  const { data, error } = await (await sb()).rpc('my_collector_points');
  if (error) throw error;
  return data?.[0] ?? { total: 0, purchases: 0 };
}
