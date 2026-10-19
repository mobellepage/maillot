import { expect, test } from '@playwright/test';

// Runs against a local Supabase stack seeded by supabase/seed.sql:
//   seller@maillot.test (@zurich_kits) has an Ajax 1994/95 open to offers
//   in their collection. Listings are shirts in collections — there is no
//   order book on the model pages any more.
// Runs serially on a fresh `db reset`.
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

test('a model page leads to its shirts in collections, not to an order book', async ({ page }) => {
  await signIn(page, 'buyer@maillot.test');
  await page.goto('/shirt/ger-26');
  await expect(page.getByRole('button', { name: /^Buy now/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Place bid/ })).toHaveCount(0);
  await page.getByRole('link', { name: /in collections/ }).first().click();
  await expect(page).toHaveURL(/\/market\?shirt=ger-26/);
});

test('seller: the full path is the guided capture with the sale goal', async ({ page }) => {
  await signIn(page, 'seller@maillot.test');
  await page.goto('/sell');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('List in a few minutes');
  await page.getByRole('link', { name: /List it completely/ }).click();
  await expect(page).toHaveURL(/\/vault\/add\?goal=sale$/);
  // The goal is already chosen: straight to the photos.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Scan');
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

test('seller profile: public page with the shirts of the collection, for sale ones marked', async ({ page }) => {
  await page.goto('/u/zurich_kits');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('@zurich_kits');
  await seen(page, page.getByRole('link', { name: /Ajax 1994\/95/ }));
  await expect(page.getByText('Open to offers').first()).toBeVisible();
});
