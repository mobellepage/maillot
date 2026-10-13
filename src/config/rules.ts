// Business rules in one place (deadlines, rounds, thresholds). Where the
// database enforces a rule too, the matching SQL function is named — change
// both together.

/** Offers on collection shirts — public.offer_policy(). */
export const OFFER_POLICY = { validHours: 48, maxRounds: 3 } as const;

export { FREE_SHIRT_LIMIT, PREMIUM_PRICE } from './plans.ts';

/**
 * Order deadlines — public.order_policy(), enforced by the run_order_lifecycle()
 * cron job (supabase/tests/database/03_lifecycle.test.sql fails if they drift).
 * Shirts go straight from seller to buyer:
 *   paid → ship within shipDays → counts as delivered after deliveryDays
 *   (or when the buyer says so) → released releaseDays later unless the buyer
 *   confirms with a photo first or reports a problem.
 * authThreshold: null while there is no authentication centre.
 */
export const ORDER_POLICY = {
  paymentHours: 24,
  shipDays: 5,
  deliveryDays: 7,
  releaseDays: 5,
  reminderLeadHours: 48,
  releaseReminderDays: [2, 4],
  authThreshold: null as number | null
} as const;
