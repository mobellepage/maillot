import { describe, expect, it } from 'vitest';
import { EXPERT_AUTH, FEES } from '../config/rules.ts';
import { BUYER_SHIPPING_CHF, SELLER_AUTH_FEE_CHF, SELLER_FEE_RATE, sellerPayout } from '../fees.ts';

describe('fees come from one place', () => {
  it('the fee module reads the central config', () => {
    expect(SELLER_FEE_RATE).toBe(FEES.sellerRate);
    expect(BUYER_SHIPPING_CHF).toBe(FEES.buyerShippingChf);
    expect(SELLER_AUTH_FEE_CHF).toBe(EXPERT_AUTH.feeChf);
  });
  it('the commission is 8% of the price, deducted from the payout', () => {
    expect(sellerPayout(250)).toEqual({ commission: 20, payout: 230 });
  });
  it('trading is limited to Switzerland and Liechtenstein, like the checkout', () => {
    expect(FEES.shippingCountries).toEqual(['CH', 'LI']);
  });
});
