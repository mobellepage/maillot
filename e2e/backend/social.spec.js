import { expect, test } from '@playwright/test';

// Likes and comments on the local seeded stack: the buyer likes and comments
// on @zurich_kits' Real Madrid 2026/27 (a collector's piece), then removes
// the comment again.
const PASSWORD = 'maillot-dev-pw';

test('a member likes and comments on a shirt in another collection', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('buyer@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });

  await page.goto('/u/zurich_kits/seed-piece');
  const like = page.getByRole('button', { name: /^Liked?$/ });
  await like.waitFor({ timeout: 10000 });
  // A retry finds the like of the first attempt: take it back first.
  if ((await like.getAttribute('aria-pressed')) === 'true') {
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'false');
  }
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^\d+ likes?$/)).toBeVisible();

  const text = 'Classic! ' + Date.now();
  await page.getByRole('textbox', { name: 'Write a comment…' }).fill(text);
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  const comment = page.getByRole('listitem').filter({ hasText: text });
  await expect(comment).toBeVisible();
  await comment.getByRole('button', { name: 'Delete' }).click();
  await expect(comment).toHaveCount(0);
});
