// Monetization model placeholders for Maillot's marketplace flows (Buy / Sell).
//
// AUDIT NOTE (Phase 5.13): Maillot's Buy/Sell checkout (see Modal.jsx, Sell.jsx) does not
// connect to a real payment processor — "Confirm purchase" and "Publish listing" only update
// local state; there is no actual charge, payout, or bank transfer happening anywhere in the
// app. The fee amounts below used to be hardcoded directly in engine.js
// (`const fee = 9, ship = 12` and `Math.round(sa * 0.08)`), which hid the fact that these are
// fixed placeholder figures standing in for Maillot's intended revenue model — a StockX/GOAT
// style buyer authentication + shipping fee, plus a seller commission — rather than numbers
// computed by any real pricing, logistics, or payments backend.
//
// This module exists to:
//   1. Name and document that revenue model explicitly, instead of burying magic numbers in
//      engine.js where their purpose isn't obvious.
//   2. Give a single, isolated place to later swap in real computation (e.g. condition/category
//      based fee tiers, carrier-quoted shipping, payment-processor cuts) without touching the
//      call sites in engine.js beyond the two functions below.

export const BUYER_AUTH_FEE_CHF = 9; // Flat per-order authentication fee charged to buyers.
export const BUYER_SHIPPING_CHF = 12; // Flat insured-shipping fee charged to buyers.
export const SELLER_FEE_RATE = 0.08; // 8% commission deducted from the seller's payout.

/**
 * @param {number} askPrice - the listed/ask price in CHF
 * @returns {{ authFee: number, shipping: number, total: number }}
 */
export function buyerCheckoutFees(askPrice: number): { authFee: number; shipping: number; total: number } {
  return { authFee: BUYER_AUTH_FEE_CHF, shipping: BUYER_SHIPPING_CHF, total: askPrice + BUYER_AUTH_FEE_CHF + BUYER_SHIPPING_CHF };
}

/**
 * @param {number} askPrice - the seller's asking price in CHF
 * @returns {{ commission: number, payout: number }}
 */
export function sellerPayout(askPrice: number): { commission: number; payout: number } {
  const commission = Math.round(askPrice * SELLER_FEE_RATE);
  return { commission, payout: askPrice - commission };
}
