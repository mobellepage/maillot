// Plans. The free allowance is enforced in the database too
// (public.free_shirt_limit(), migration premium_plan) — change both together.
// Prices are what the app shows; what Stripe charges comes from the two
// price ids set as Supabase secrets (STRIPE_PREMIUM_MONTHLY_PRICE / _YEARLY_PRICE).
export const FREE_SHIRT_LIMIT = 10;

/**
 * Premium is paused (2026-10-18): no shirt limit, no plan page or prompts.
 * The database trigger is off too (migration premium_paused). To bring it
 * back: set this to true and re-create the trigger custom_items_plan_limit.
 */
export const PREMIUM_ENABLED = false;

export const PREMIUM_PRICE = { month: 4.9, year: 49 } as const;
export type PremiumInterval = keyof typeof PREMIUM_PRICE;
