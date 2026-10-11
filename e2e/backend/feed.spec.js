import { expect, test } from '@playwright/test';

// The feed shows live listings with their seller (seed: @zurich_kits has open
// asks) and a like puts the shirt on the watchlist.
test('the feed shows listings from sellers and a like lands on the watchlist', async ({ page }) => {
  await page.goto('/feed');
  // Listings come first; the seed's seller is the first one shown.
  const first = page.locator('.feed-item').first();
  await expect(first.getByRole('link', { name: '@zurich_kits' })).toBeVisible({ timeout: 10000 });
  await expect(first.getByRole('link', { name: 'View & buy' })).toBeVisible();

  const name = await first.getByRole('heading', { level: 2 }).innerText();
  await first.getByRole('button', { name: 'Like ' + name }).click();
  await expect(first.getByRole('button', { name: 'Unlike ' + name })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/watchlist');
  await expect(page.getByRole('link', { name })).toBeVisible();
});
