import { expect, test } from '@playwright/test';

test('home page starts with the search, then trending shirts @mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Maillot/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which shirt do you have – or want?');
  await expect(page.getByRole('combobox', { name: 'Search any shirt' })).toBeVisible();
  // The pitch is still there, at the end.
  await expect(page.getByRole('heading', { level: 2, name: /Your collection/ })).toBeAttached();
  await expect(page.getByText('Trending shirts', { exact: false })).toBeVisible();
  // Nothing may stick out sideways: on a phone the browser would zoom out
  // and taps would land on the wrong element.
  await expect(page.getByRole('heading', { name: 'New to the catalogue' })).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('search leads to a shareable product URL and Back works', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Search any shirt' }).fill('zidane');
  // Suggestions from the marketplace show while typing (the library needs the backend).
  await expect(page.getByRole('option', { name: /France 1998 Home/ })).toBeVisible();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  // The search lives in the URL, so results are shareable.
  await expect(page).toHaveURL(/\/market\?q=zidane$/);
  await page.getByRole('link', { name: 'France 1998 Home' }).click();
  await expect(page).toHaveURL(/\/shirt\/fra-98$/);
  await expect(page).toHaveTitle(/^France 1998 Home/);
  await page.goBack();
  await expect(page).toHaveURL(/\/market\?q=zidane$/);
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
  await expect(page.getByText('Maillot').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('unknown URLs fall back to the home page', async ({ page }) => {
  await page.goto('/this/does/not/exist');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which shirt do you have – or want?');
});

test('product pages link to the buying explainer', async ({ page }) => {
  await page.goto('/shirt/fra-98');
  await page.getByRole('link', { name: 'How it works →' }).click();
  await expect(page).toHaveURL(/\/authentication$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/How buying works/i);
  await expect(page.getByRole('heading', { name: 'Automatic pre-check' })).toBeVisible();
  await expect(page.locator('main li').filter({ hasText: '✓' })).toHaveCount(4);
  await expect(page.getByText(/Zürich/)).toHaveCount(0);
});

test('footer reaches every legal page and no fonts are fetched from Google @mobile', async ({ page }) => {
  const thirdParty = [];
  page.on('request', (r) => /googleapis|gstatic/.test(r.url()) && thirdParty.push(r.url()));
  await page.goto('/');
  // The home page grows once the catalogue sections render; scroll to the
  // footer only after that (slow CI machines click mid-growth otherwise).
  await expect(page.getByRole('heading', { name: 'New to the catalogue' })).toBeAttached();
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

test('forgotten password: the sign-in page offers a reset link @mobile', async ({ page }) => {
  await page.goto('/signin');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reset password');
  await expect(page.getByLabel('Password')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
});

test('an expired email link is explained, not silently ignored', async ({ page }) => {
  await page.goto('/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await expect(page.getByText('That link has expired or was already used. Please request a new one.')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('on a phone the filters open as a sheet whose button counts the matches @mobile', async ({ page }) => {
  test.skip(!test.info().project.name.includes('mobile'), 'phone layout only');
  await page.goto('/market');
  await page.getByRole('button', { name: 'Filters' }).click();
  const sheet = page.getByRole('dialog');
  const show = sheet.getByRole('button', { name: /^Show \d+ shirts$/ });
  const before = Number((await show.textContent()).match(/\d+/)[0]);
  await sheet.getByText('Retro', { exact: true }).click();
  await expect(show).not.toHaveText(`Show ${before} shirts`);
  await show.click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/type=Retro/);
});

test('the market can show a compact list instead of cards, and remembers it', async ({ page }) => {
  await page.goto('/market');
  await page.getByRole('button', { name: 'Compact list' }).click();
  await expect(page.getByRole('button', { name: 'Compact list' })).toHaveAttribute('aria-pressed', 'true');
  const list = page.getByRole('list', { name: 'Results' });
  await expect(list.getByRole('link', { name: 'Germany 2026 Home "The Last Adidas"' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Compact list' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('store badges show "coming soon" until the store links are set', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('main .store-badges').first();
  await expect(hero.getByRole('img', { name: 'App Store — coming soon' })).toBeVisible();
  await expect(hero.getByRole('img', { name: 'Google Play — coming soon' })).toBeVisible();
  await expect(page.locator('a.store-badge')).toHaveCount(0);
});

test('the daily puzzle says so when today’s kit can’t load', async ({ page }) => {
  await page.goto('/daily');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Daily shirt puzzle');
  await expect(page.getByRole('button', { name: /try again/i }).first()).toBeVisible({ timeout: 15000 });
});

test('the kit library says so when it can’t load', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kit library');
  await expect(page.getByRole('button', { name: /try again/i }).first()).toBeVisible({ timeout: 15000 });
});

test('the side rail leads to the puzzle and the library', async ({ page }) => {
  await page.goto('/market');
  const rail = page.getByRole('navigation', { name: 'Daily features' });
  await rail.getByRole('link', { name: 'Kit library' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await rail.getByRole('link', { name: 'Daily shirt puzzle' }).click();
  await expect(page).toHaveURL(/\/daily$/);
  // Not while adding a shirt.
  await page.goto('/signin');
  await expect(rail).toHaveCount(0);
});

test('Discover leads to eras and legends', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Build your digital shirt collection/ })).toBeVisible();
  await page.getByRole('link', { name: '90s', exact: true }).click();
  await expect(page).toHaveURL(/\/era\/1990$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kits of the 90s');
  await page.goto('/');
  await page.getByRole('link', { name: 'Zinédine Zidane' }).click();
  await expect(page).toHaveURL(/\/legends\/zidane$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The kits of Zinédine Zidane');
});
