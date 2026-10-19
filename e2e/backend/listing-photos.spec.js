import { expect, test } from '@playwright/test';

// A quick listing is a shirt in the seller's collection, for sale, with
// photos of the actual shirt: front and back are required. It shows on the
// marketplace at once, "self-reported". Runs against the local stack seeded
// by supabase/seed.sql.
const PASSWORD = 'maillot-dev-pw';

test('a quick listing needs front and back, and lands on the marketplace', async ({ page, browser }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('seller@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });

  await page.goto('/sell?shirt=fra-98&size=L');
  await page.getByRole('button', { name: /List it quickly/ }).click();
  const next = page.getByRole('button', { name: /Continue/ });
  await expect(next).toBeDisabled();
  await page.getByLabel('Front', { exact: true }).setInputFiles('e2e/fixtures/shirt-front.jpg');
  await expect(next).toBeDisabled();
  await page.getByLabel('Back', { exact: true }).setInputFiles('e2e/fixtures/shirt-back.jpg');
  await expect(next).toBeEnabled();
  await next.click();
  // From CHF 500 the quick listing stops: expert authentication needs the complete path.
  await page.locator('input[inputmode="numeric"]').fill('990');
  await expect(page.getByText(/selling needs expert authentication/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Review listing/ })).toBeDisabled();
  await page.locator('input[inputmode="numeric"]').fill('490');
  await page.getByRole('button', { name: /Review listing/ }).click();
  await page.getByRole('button', { name: 'Publish listing' }).click();
  await expect(page.getByRole('heading', { name: 'Your shirt is for sale' })).toBeVisible();

  const visitor = await browser.newPage();
  await visitor.goto('/market?shirt=fra-98');
  const card = visitor.getByRole('listitem').filter({ hasText: '@zurich_kits' }).filter({ hasText: /CHF\s?490/ });
  await expect(card).toBeVisible({ timeout: 10000 });
  await expect(card).toContainText('Self-reported');
  await expect(card).toContainText('For sale');
  await visitor.close();
});
