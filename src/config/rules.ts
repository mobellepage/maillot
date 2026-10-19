// Business rules in one place (deadlines, rounds, thresholds). Where the
// database enforces a rule too, the matching SQL function is named — change
// both together.

/**
 * The versions a shirt comes in (they belong to the exemplar, never to the
 * catalogue model) and what each is worth against the catalogue's market
 * value, which is the reference for a very good replica. The database
 * values the same way — private.edition_factor(); change both together.
 * Match-issued and match-worn shirts only show a value once an expert has
 * verified them.
 */
export const VERSIONS = [
  { key: 'replica', factor: 1, needsExpert: false },
  { key: 'playerIssue', factor: 1.45, needsExpert: false },
  { key: 'matchIssued', factor: 2.1, needsExpert: true },
  { key: 'matchWorn', factor: 3.2, needsExpert: true }
] as const;

/**
 * Demo exemplars fill the marketplace and the feed (marked DEMO, not
 * buyable) until there are enough real ones. Switch off at launch.
 */
export const SHOW_DEMO_EXEMPLARS = true;

/** From this value (CHF), adding a public shirt reminds the collector it can be made private. */
export const PUBLIC_VALUE_HINT = 1000;

/** Below this many real shirts to buy, the marketplace says it's just getting started. */
export const MARKET_FEW_OFFERS = 12;

/** Offers on collection shirts — public.offer_policy(). */
export const OFFER_POLICY = { validHours: 48, maxRounds: 3 } as const;

export { FREE_SHIRT_LIMIT, PREMIUM_ENABLED, PREMIUM_PRICE } from './plans.ts';

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

/**
 * Collector levels: reached with EITHER enough shirts OR enough collection
 * value (CHF, the app's market values). Free members can climb by value
 * too, even with the 10-shirt limit. Names are message keys level.<key>.
 */
/**
 * Collector points for shirts bought through Maillot, once the purchase is
 * complete: per shirt plus per franc paid. The database awards them
 * (private.purchase_points) — change both together.
 */
export const COLLECTOR_POINTS = { perShirt: 100, perFranc: 1 } as const;

export const COLLECTOR_LEVELS = [
  { key: 'rookie', shirts: 1, value: 0, color: '#8A8F8B' },
  { key: 'fan', shirts: 5, value: 400, color: '#2FAE63' },
  { key: 'collector', shirts: 15, value: 1500, color: '#2F7DE1' },
  { key: 'connoisseur', shirts: 30, value: 4000, color: '#7A4FE0' },
  { key: 'curator', shirts: 60, value: 10000, color: '#E0702F' },
  { key: 'legend', shirts: 100, value: 25000, color: '#C9A227' },
  { key: 'hall', shirts: 200, value: 60000, color: '#1D1D1F' }
] as const;

/**
 * Where the feed's cards come from: the kit library for now; once members
 * list enough shirts, 'market' (live listings first, catalogue filling in).
 */
export const FEED_SOURCE: 'library' | 'market' = 'library';
