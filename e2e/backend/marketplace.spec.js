import { expect, test } from '@playwright/test';

// Runs against a local Supabase stack seeded by supabase/seed.sql:
//   seller@maillot.test has an open ask on ger-26 M at CHF 139
//   buyer@maillot.test has an open bid on fra-98 M at CHF 250
// The suite mutates the order book, so it runs serially on a fresh `db reset`.
test.describe.configure({ mode: 'serial' });

const PASSWORD = 'maillot-dev-pw';

async function signIn(page, email) {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/);
}

test('buyer: Buy now matches the live ask, then cancels before paying', async ({ page }) => {
  await signIn(page, 'buyer@maillot.test');
  await page.goto('/shirt/ger-26');
  // Direct loads open size M, where the seed's ask lives.
  const buy = page.getByRole('button', { name: /^Buy now/ });
  await expect(buy).toContainText('139');
  await buy.click();
  await page.getByRole('button', { name: /^Confirm purchase/ }).click();
  await expect(page.getByText('It’s a match')).toBeVisible();

  await page.getByRole('button', { name: 'Pay later from Orders' }).click();
  await page.goto('/orders');
  await expect(page.getByText('Payment pending').first()).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).first().click();
  await expect(page.getByText('Cancelled').first()).toBeVisible();

  // The seller's ask went back on the book.
  await page.goto('/shirt/ger-26');
  await expect(page.getByRole('button', { name: /^Buy now/ })).toContainText('139');
});

test('seller: listing at the top bid sells instantly', async ({ page }) => {
  await signIn(page, 'seller@maillot.test');
  await page.goto('/sell');
  await page.getByLabel('Search the catalogue').fill('france 1998');
  await page.getByText('France 1998 Home').first().click();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText('Sell now to top bid')).toBeVisible();
  await page.getByText('Sell now to top bid').click();
  await page.getByRole('button', { name: /Review listing/ }).click();
  await page.getByRole('button', { name: 'Publish listing' }).click();
  await expect(page.getByRole('heading', { name: 'Sold' })).toBeVisible();
});

test('bid below the ask stays on the book', async ({ page }) => {
  await signIn(page, 'buyer@maillot.test');
  await page.goto('/shirt/juv-9697');
  await page.getByRole('button', { name: 'Place bid' }).first().click();
  const amount = page.locator('input[inputmode="numeric"]');
  await amount.fill('200');
  await page.getByRole('button', { name: /^Place bid · / }).click();
  await expect(page.getByRole('heading', { name: 'Bid placed' }).or(page.getByText('Bid placed'))).toBeVisible();
});
