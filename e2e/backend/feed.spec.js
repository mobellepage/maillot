import { expect, test } from '@playwright/test';

// The feed is a stack of cards: live listings first (seed: @zurich_kits has
// open asks), like = onto the wishlist, skip = next card.
test('swiping through the feed: like puts the shirt on the wishlist, skip moves on', async ({ page }) => {
  await page.goto('/feed');
  const card = page.locator('[aria-roledescription="shirt card"]');
  await expect(card).toContainText('@zurich_kits', { timeout: 10000 });

  const liked = (await card.getByRole('heading', { level: 2 }).innerText()).trim();
  await page.getByRole('button', { name: 'Like ' + liked }).click();
  // The next card replaces it.
  await expect(page.getByRole('button', { name: 'Like ' + liked })).toHaveCount(0);

  const skipped = (await card.getByRole('heading', { level: 2 }).innerText()).trim();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Skip ' + skipped })).toHaveCount(0);

  await page.goto('/watchlist');
  await expect(page.getByRole('link', { name: liked })).toBeVisible();
});
