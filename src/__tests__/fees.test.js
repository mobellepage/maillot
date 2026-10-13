import { describe, expect, it } from 'vitest';
import { buyerCheckoutFees, sellerPayout, BUYER_AUTH_FEE_CHF, BUYER_SHIPPING_CHF } from '../fees.ts';

// These numbers are duplicated server-side in match_order_book() (shipping
// 12, 8% commission; the auth fee is zeroed by the orders_route_inspection
// trigger while there is no authentication centre) — if either side changes,
// these tests and supabase/tests/database/02_marketplace.test.sql must change together.
describe('fees', () => {
  it('adds the flat shipping fee (and no authentication fee) to the buyer total', () => {
    expect(buyerCheckoutFees(120)).toEqual({ authFee: 0, shipping: 12, total: 132 });
    expect(BUYER_AUTH_FEE_CHF + BUYER_SHIPPING_CHF).toBe(12);
  });

  it('deducts an 8% commission, rounded to whole francs, from the seller payout', () => {
    expect(sellerPayout(120)).toEqual({ commission: 10, payout: 110 });
    expect(sellerPayout(235)).toEqual({ commission: 19, payout: 216 });
    expect(sellerPayout(0)).toEqual({ commission: 0, payout: 0 });
    // Dealers on pilot terms pay their own rate.
    expect(sellerPayout(200, 0.05)).toEqual({ commission: 10, payout: 190 });
  });
});
