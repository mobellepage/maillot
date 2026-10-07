// @vitest-environment happy-dom
import React from 'react'; // test files are compiled with the classic JSX runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrefsProvider } from '../lib/prefs.tsx';
import { BY } from '../data.ts';

vi.mock('../utils/db.ts', () => ({
  loadComps: vi.fn(async () => [
    { source: 'ebay', external_id: '1', marketplace: 'EBAY_DE', kind: 'listing', match: 'exact', edition: 'replica', condition: 'used', title: 'Holland Trikot 1988 adidas Gr. L', url: 'https://www.ebay.de/itm/1', price: 349, currency: 'EUR', price_chf: 328, seen_at: '2026-10-06T03:30:00Z', sold_at: null },
    { source: 'ebay', external_id: '2', marketplace: 'EBAY_GB', kind: 'listing', match: 'similar', edition: 'replica', condition: 'unknown', title: 'Netherlands 1988 away shirt', url: null, price: 190, currency: 'GBP', price_chf: 214, seen_at: '2026-10-06T03:30:00Z', sold_at: null }
  ])
}));
const { ValuationCard } = await import('../features/market/detail/ValuationCard.tsx');

afterEach(cleanup);
vi.stubGlobal('fetch', () => new Promise(() => {}));

const shirt = (valuation, price = 310) => ({ ...BY['ned-88'], price, valuation, priceSource: valuation ? 'market' : 'estimate' });
const show = (s) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PrefsProvider>
        <ValuationCard s={s} />
      </PrefsProvider>
    </QueryClientProvider>
  );

describe('ValuationCard', () => {
  it('shows value, range, confidence, evidence and the comparables with links', async () => {
    show(shirt({ value: 310, low: 306, high: 340, confidence: 'medium', nTrades: 1, nExact: 5, nSimilar: 1, computedAt: '2026-10-07T04:30:00Z' }));
    expect(screen.getByText('Medium confidence')).toBeTruthy();
    expect(screen.getByText(/Range .*306.*340/)).toBeTruthy();
    expect(screen.getByText('• 1 sale on MAILLOT')).toBeTruthy();
    expect(screen.getByText('• 5 matching offers on other marketplaces')).toBeTruthy();
    expect(screen.getByText('• 1 related shirt')).toBeTruthy();
    expect(await screen.findByText('Holland Trikot 1988 adidas Gr. L')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'View: Holland Trikot 1988 adidas Gr. L' });
    expect(link.getAttribute('href')).toBe('https://www.ebay.de/itm/1');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByText(/eBay.co.uk · Related/)).toBeTruthy();
    expect(screen.getByText(/usually sell for less/)).toBeTruthy();
  });

  it('is honest when there is no evidence yet', () => {
    show(shirt({ value: 310, low: 264, high: 357, confidence: 'low', nTrades: 0, nExact: 0, nSimilar: 0, computedAt: '2026-10-07T04:30:00Z' }));
    expect(screen.getByText(/this is our catalogue estimate/)).toBeTruthy();
    expect(screen.queryByText(/confidence/)).toBe(null);
  });
});
