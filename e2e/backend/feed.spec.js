import { expect, test } from '@playwright/test';

// The feed is a stack of cards: live listings first (seed: @zurich_kits has
// open asks), like = onto the wishlist, skip = next card without a like.
test('swiping through the feed: like puts the shirt on the wishlist, skip does not', async ({ page }) => {
  await page.goto('/feed');
  const card = page.locator('[aria-roledescription="shirt card"]');
  const wishlist = page.getByRole('link', { name: /^Wishlist: \d+ shirts$/ });
  await expect(card).toContainText('@zurich_kits', { timeout: 10000 });
  await expect(wishlist).toHaveAccessibleName('Wishlist: 0 shirts');

  const liked = (await card.getByRole('heading', { level: 2 }).innerText()).trim();
  await page.getByRole('button', { name: 'Like ' + liked }).click();
  await expect(wishlist).toHaveAccessibleName('Wishlist: 1 shirts');
  await expect(page.getByRole('button', { name: 'Back to the last shirt' })).toBeEnabled();

  // Skipping (left arrow) moves on without adding anything.
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(400);
  await expect(wishlist).toHaveAccessibleName('Wishlist: 1 shirts');

  await page.goto('/watchlist');
  await expect(page.getByRole('link', { name: liked }).first()).toBeVisible();
});
