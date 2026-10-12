// Business rules in one place (deadlines, rounds, thresholds). Where the
// database enforces a rule too, the matching SQL function is named — change
// both together.

/** Offers on collection shirts — public.offer_policy(). */
export const OFFER_POLICY = { validHours: 48, maxRounds: 3 } as const;

export { FREE_SHIRT_LIMIT, PREMIUM_PRICE } from './plans.ts';
