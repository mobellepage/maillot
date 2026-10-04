import { describe, expect, it } from 'vitest';
import { formatMoney, FALLBACK_RATES } from '../utils/currency.ts';

describe('formatMoney', () => {
  const rates = { CHF: 1, EUR: 1.05, USD: 1.13, GBP: 0.95 };

  it('formats CHF with Swiss grouping', () => {
    // CLDR switched the de-CH group separator from ’ to an ASCII apostrophe;
    // accept either so the test doesn't depend on the ICU version.
    expect(formatMoney(1284, 'CHF', rates)).toMatch(/^CHF\u00a01['\u2019]284$/);
  });

  it('converts and rounds to whole units', () => {
    expect(formatMoney(100, 'USD', rates)).toBe('$113');
    expect(formatMoney(100, 'EUR', rates)).toBe('€ 105');
    expect(formatMoney(100, 'GBP', rates)).toBe('£95');
  });

  it('falls back to built-in rates and CHF formatting', () => {
    expect(formatMoney(100, 'USD', null)).toBe('$' + Math.round(100 * FALLBACK_RATES.USD));
    expect(formatMoney(100, 'XYZ', rates)).toBe('CHF 100');
    expect(formatMoney(undefined, 'CHF', rates)).toBe('CHF 0');
  });
});
