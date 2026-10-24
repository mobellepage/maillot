// Plans (2026-10-19). The collection is free and unlimited; Premium pays for
// what costs money to run. The database enforces the same numbers
// (private.plan_policy(), migration premium_scans_trial) — change both together.
// Prices are what the app shows; what Stripe charges comes from the two
// price ids set as Supabase secrets (STRIPE_PREMIUM_MONTHLY_PRICE / _YEARLY_PRICE).
export const PLAN = {
  /** AI scans (recognition and pre-checks) a month on the free plan. */
  freeScans: 20,
  /** Premium's fair use: scans a month. */
  premiumScans: 500,
  /** Every new account starts with this many days of Premium, without a card. */
  trialDays: 7,
  /** Commission on a sale with paid Premium (free: FEES.sellerRate). */
  premiumRate: 0.06,
  /** Off the expert authentication with paid Premium. */
  authDiscountChf: 10
} as const;

/**
 * Premium is switched off until further notice (Mohamed, 2026-10-24: the
 * App Store would require Apple's in-app purchase). Every account gets every
 * feature (private.premium_features is true for all); nothing is sold and
 * the app never mentions Premium. Set true to bring the page and hints back.
 */
export const PREMIUM_ENABLED = false;

/** Studio photos, the insurance list, scans with fair use: paid, trial — or everyone while Premium is off. */
export const hasFullPlan = (p: { premium: boolean; trial: boolean } | null | undefined): boolean => !PREMIUM_ENABLED || !!p?.premium || !!p?.trial;

export const PREMIUM_PRICE = { month: 4.9, year: 39 } as const;
export type PremiumInterval = keyof typeof PREMIUM_PRICE;
