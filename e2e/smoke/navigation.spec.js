import { expect, test } from '@playwright/test';

test('home page renders the hero and trending shirts @mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/MAILLOT/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every shirt');
  await expect(page.getByText('Trending shirts', { exact: false })).toBeVisible();
});

test('search leads to a shareable product URL and Back works', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Search any shirt…').fill('maradona');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/market$/);
  await page.getByText('Boca Juniors 1981 Home').first().click();
  await expect(page).toHaveURL(/\/shirt\/boc-81$/);
  await expect(page).toHaveTitle(/^Boca Juniors 1981 Home/);
  await page.goBack();
  await expect(page).toHaveURL(/\/market$/);
});

test('deep link to a product shows market value and an honest empty order book', async ({ page }) => {
  await page.goto('/shirt/ger-26');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Germany 2026 Home/i);
  await expect(page.getByText('Index estimate', { exact: true })).toBeVisible();
  await expect(page.getByText('No sellers yet')).toBeVisible();
  // No real seller => no "Buy now"; the primary action is a bid.
  await expect(page.getByRole('button', { name: /^Buy now/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Place bid' })).toBeVisible();
});

test('"Sell yours" opens the sell flow with the shirt preselected', async ({ page }) => {
  await page.goto('/shirt/rma-2627');
  await page.getByRole('button', { name: 'Sell yours' }).click();
  await expect(page).toHaveURL(/\/sell$/);
  await expect(page.getByText('Real Madrid 2026/27 Home').first()).toBeVisible();
  await expect(page.getByText('Condition', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Change' }).click();
  await page.getByLabel('Search the catalogue').fill('pelé');
  await page.getByText('Brazil 1970 Home').first().click();
  await expect(page.getByText('Brazil 1970 Home').first()).toBeVisible();
  await expect(page.getByText('Condition', { exact: true })).toBeVisible();
});

test('private pages redirect signed-out visitors to sign-in', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByText('Bitte zuerst anmelden.')).toBeVisible();
});

test('a malformed share link shows an error page instead of crashing @mobile', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/vault/%%%broken');
  await expect(page.getByText('MAILLOT').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('unknown URLs fall back to the home page', async ({ page }) => {
  await page.goto('/this/does/not/exist');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every shirt');
});
