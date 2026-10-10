import { expect, test } from '@playwright/test';

// Listings carry photos of the actual shirt; buyers (even signed out) see
// them under the price. Runs against the local stack seeded by
// supabase/seed.sql; France 1998 size L has no other listing there.
const PASSWORD = 'maillot-dev-pw';

test('a listing needs a front photo, and buyers see its photos', async ({ page, browser }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('seller@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });

  await page.goto('/sell?shirt=fra-98&size=L');
  const next = page.getByRole('button', { name: /Continue/ });
  await expect(next).toBeDisabled();
  await page.getByLabel('Front', { exact: true }).setInputFiles('public/catalog/nap-8788-400.jpg');
  await page.getByLabel('Back', { exact: true }).setInputFiles('public/catalog/sui-26-400.jpg');
  await expect(next).toBeEnabled();
  await next.click();
  await page.locator('input[inputmode="numeric"]').fill('990');
  await page.getByRole('button', { name: /Review listing/ }).click();
  await page.getByRole('button', { name: 'Publish listing' }).click();
  await expect(page.getByRole('heading', { name: 'You’re live' })).toBeVisible();

  const visitor = await browser.newPage();
  await visitor.goto('/shirt/fra-98?size=L');
  await expect(visitor.getByText('Photos of this shirt')).toBeVisible({ timeout: 10000 });
  await visitor.getByRole('button', { name: 'Open photo: Back' }).click();
  await expect(visitor.getByRole('dialog').getByRole('img', { name: 'Back' })).toBeVisible();
  await visitor.close();
});
