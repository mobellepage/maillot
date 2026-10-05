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
  // The search lives in the URL, so results are shareable.
  await expect(page).toHaveURL(/\/market\?q=maradona$/);
  await page.getByRole('link', { name: 'Boca Juniors 1981 Home' }).click();
  await expect(page).toHaveURL(/\/shirt\/boc-81$/);
  await expect(page).toHaveTitle(/^Boca Juniors 1981 Home/);
  await page.goBack();
  await expect(page).toHaveURL(/\/market\?q=maradona$/);
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
  await page.getByRole('link', { name: 'Sell yours' }).click();
  await expect(page).toHaveURL(/\/sell\?shirt=rma-2627&size=M$/);
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
  await expect(page.getByText('Please sign in first.')).toBeVisible();
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

test('product pages link to the authentication explainer', async ({ page }) => {
  await page.goto('/shirt/fra-98');
  await page.getByRole('link', { name: 'How it works →' }).click();
  await expect(page).toHaveURL(/\/authentication$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/How authentication works/i);
  await expect(page.getByText('The 14-point checklist')).toBeVisible();
  await expect(page.locator('main li').filter({ hasText: '✓' })).toHaveCount(14);
});

test('footer reaches every legal page and no fonts are fetched from Google @mobile', async ({ page }) => {
  const thirdParty = [];
  page.on('request', (r) => /googleapis|gstatic/.test(r.url()) && thirdParty.push(r.url()));
  await page.goto('/');
  for (const [link, heading, path] of [
    ['Terms of use', /Terms of use/i, /\/legal\/terms$/],
    ['Privacy policy', /Privacy policy/i, /\/legal\/privacy$/],
    ['Imprint', /Imprint/i, /\/legal\/imprint$/],
    ['Help & contact', /Help & contact/i, /\/help$/]
  ]) {
    await page.locator('footer').getByRole('link', { name: link }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
  }
  expect(thirdParty).toEqual([]);
});

test('certificate check: footer link, code form, and a clear error when the check fails', async ({ page }) => {
  await page.goto('/');
  await page.locator('footer').getByRole('link', { name: 'Verify a certificate' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Verify a certificate/i);
  await page.getByLabel('Certificate code').fill('mlt-abcd-efgh-jkmn');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page).toHaveURL(/\/verify\/MLT-ABCD-EFGH-JKMN$/);
  // The smoke backend is unreachable, so the lookup fails — visibly, not silently.
  await expect(page.getByText(/couldn’t check this code/i)).toBeVisible({ timeout: 15000 });
});

test('index report and data API are reachable and the report offers a CSV', async ({ page }) => {
  await page.goto('/');
  await page.locator('footer').getByRole('link', { name: 'Shirt Index report' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Maillot Shirt Index/i);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/^maillot-shirt-index-\d{4}-\d{2}-\d{2}\.csv$/);
  await page.getByRole('link', { name: 'Data API' }).first().click();
  await expect(page).toHaveURL(/\/developers$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Shirt prices as data/i);
});

test('failed loads say so instead of looking empty, and offline is announced', async ({ page, context }) => {
  // The smoke backend is unreachable, so the live order book can't load.
  await page.goto('/shirt/ger-26');
  await expect(page.getByText(/Live bids and asks couldn’t load/)).toBeVisible({ timeout: 15000 });

  await context.setOffline(true);
  await expect(page.getByText(/You’re offline/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(/You’re offline/)).toBeHidden();
});
