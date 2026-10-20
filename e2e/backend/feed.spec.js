import { expect, test } from '@playwright/test';

// The feed is a stack of cards — news from collections first, then kits of
// the library (FEED_SOURCE): like = onto the wishlist, skip = next card
// without a like.
test('swiping through the feed: like puts the kit on the wishlist, skip does not', async ({ page }) => {
  await page.goto('/feed');
  const card = page.locator('[aria-roledescription="shirt card"]');
  const wishlist = page.getByRole('link', { name: /^Wishlist: \d+ shirts$/ });
  await expect(card).toContainText(/added a shirt|put it up for sale|open to offers|lowered the price/, { timeout: 10000 });
  await expect(wishlist).toHaveAccessibleName('Wishlist: 0 shirts');
  // Skipping never likes anything: on to the first kit of the library.
  for (let i = 0; i < 40 && !((await card.textContent()) ?? '').includes('From the kit library'); i++) {
    await page.getByRole('button', { name: /^Skip/ }).click();
    await page.waitForTimeout(350);
  }
  await expect(card).toContainText('From the kit library');
  await expect(wishlist).toHaveAccessibleName('Wishlist: 0 shirts');

  const liked = (await card.getAttribute('aria-label')) ?? '';
  const heading = (await card.getByRole('heading', { level: 2 }).innerText()).trim();
  await page.getByRole('button', { name: 'Put ' + liked + ' on your wishlist' }).click();
  await expect(wishlist).toHaveAccessibleName('Wishlist: 1 shirts');
  await expect(page.getByRole('button', { name: 'Back to the last shirt' })).toBeEnabled();

  // Skipping (left arrow) moves on without adding anything.
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(400);
  await expect(wishlist).toHaveAccessibleName('Wishlist: 1 shirts');

  await page.goto('/watchlist');
  await expect(page.getByRole('heading', { name: 'Kits you liked (1)' })).toBeVisible();
  await expect(page.getByRole('link', { name: heading }).first()).toBeVisible();
});
