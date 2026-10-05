import { expect, test } from '@playwright/test';

// Runs against a local Supabase stack seeded by supabase/seed.sql:
//   seller@maillot.test has an open ask on ger-26 M at CHF 139
//   buyer@maillot.test has an open bid on fra-98 M at CHF 250
// The suite mutates the order book, so it runs serially on a fresh `db reset`.
test.describe.configure({ mode: 'serial' });

const PASSWORD = 'maillot-dev-pw';

/** Like expect(locator).toBeVisible(), but a failure says what the page showed instead. */
async function seen(page, locator, timeout = 10000) {
  try {
    await expect(locator).toBeVisible({ timeout });
  } catch {
    throw new Error('Not visible: ' + locator + '\nPage: ' + (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 600));
  }
}

async function signIn(page, email) {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  try {
    await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });
  } catch {
    // Surface the auth error text in the CI annotation instead of a bare URL mismatch.
    throw new Error('Sign-in failed: ' + (await page.locator('main').innerText()).slice(0, 300));
  }
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
  // Irreversible actions ask first.
  await page.getByRole('dialog', { name: 'Cancel this order?' }).getByRole('button', { name: 'Cancel order' }).click();
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
  await seen(page, page.getByText('Sell now to top bid'));
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

test('new member: sign up, answer the welcome questions, land on the first step', async ({ page }) => {
  const email = `new-${Date.now()}@maillot.test`;
  await page.goto('/signin');
  await page.getByRole('button', { name: /No account yet/ }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|passwort/i).fill('a-long-test-password-1');
  await page.locator('form').getByRole('button', { name: /create|erstellen/i }).click();
  await expect(page).toHaveURL(/\/welcome$/, { timeout: 10000 });
  // Until it's answered (or skipped), other pages lead back here.
  await page.goto('/market');
  await expect(page).toHaveURL(/\/welcome$/);

  await page.getByRole('button', { name: /Track my collection/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Serie A' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('new_member_' + String(Date.now()).slice(-6));
  await seen(page, page.getByText('✓ Available'));
  await page.getByRole('button', { name: 'Add your first shirt' }).click();
  await expect(page).toHaveURL(/\/vault\/add$/);

  // Answered once: no more detours.
  await page.goto('/market');
  await expect(page).toHaveURL(/\/market$/);
});

test('seller profile: public page with live listings, linked from the shirt page', async ({ page }) => {
  await page.goto('/shirt/juv-9697?size=L');
  await page.getByRole('link', { name: '@zurich_kits' }).click();
  await expect(page).toHaveURL(/\/u\/zurich_kits$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('@zurich_kits');
  await seen(page, page.getByRole('link', { name: /Juventus 1996/ }));
});
