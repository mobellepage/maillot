import { existsSync, readFileSync } from 'node:fs';
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
  // A suggestion leads to the shirt's own, shareable page, and Back returns.
  await page.getByRole('option', { name: /France 1998 Home/ }).click();
  await expect(page).toHaveURL(/\/shirt\/fra-98$/);
  await expect(page).toHaveTitle(/^France 1998 Home/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  // The search itself lives in the URL, so results are shareable.
  await page.getByRole('combobox', { name: 'Search any shirt' }).fill('zidane');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/market\?q=zidane&status=all$/);
});

test('deep link to a product shows its market value and the way to the shirts in collections', async ({ page }) => {
  await page.goto('/shirt/ger-26');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Germany 2026 Home/i);
  await expect(page.getByText('Index estimate', { exact: true })).toBeVisible();
  // No order book: no "Buy now", no bids — the shirts to buy are in collections.
  await expect(page.getByRole('button', { name: /^Buy now/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Place bid/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /See \d+ shirts? to buy|Shirts in collections/ })).toHaveAttribute('href', /\/market\?shirt=ger-26/);
  await expect(page.getByRole('link', { name: 'Sell yours' })).toBeVisible();
});

test('"Sell yours" opens the sell flow with the shirt preselected', async ({ page }) => {
  await page.goto('/shirt/rma-2627');
  await page.getByRole('link', { name: 'Sell yours' }).click();
  await expect(page).toHaveURL(/\/sell\?shirt=rma-2627&size=M$/);
  // Two ways: quick (front and back, "self-reported") or complete (guided photos and pre-check).
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('List in a few minutes');
  await expect(page.getByRole('link', { name: /List it completely/ })).toHaveAttribute('href', '/vault/add?goal=sale');
  await page.getByRole('button', { name: /List it quickly/ }).click();
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
  // The pre-check's four points and the expert authentication's five, which says honestly that it starts soon.
  await expect(page.locator('main li').filter({ hasText: '✓' })).toHaveCount(9);
  const expert = page.locator('#expert');
  await expect(expert.getByRole('heading', { name: 'Expert authentication' })).toBeVisible();
  await expect(expert).toContainText('Coming soon');
  await expect(expert).toContainText(/CHF\s?500/);
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

test('certificate check: no footer link while there are no certificates; the form still fails clearly', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer').getByRole('link', { name: 'Verify a certificate' })).toHaveCount(0);
  await page.goto('/verify');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Verify a certificate/i);
  await expect(page.getByText(/until then there are no certificates/)).toBeVisible();
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
  // The smoke backend is unreachable, so the collectors' shirts can't load.
  await page.goto('/market');
  await expect(page.getByText(/The collectors’ shirts couldn’t be loaded/)).toBeVisible({ timeout: 15000 });

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
  await page.goto('/library/catalog');
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

test('the catalogue can show a compact list instead of cards, and remembers it', async ({ page }) => {
  await page.goto('/library/catalog');
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

test('the side rail leads to Fantasy, the library and the kit designer', async ({ page }) => {
  await page.goto('/market');
  const rail = page.getByRole('navigation', { name: 'Daily features' });
  await rail.getByRole('link', { name: 'Kit library' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await rail.getByRole('link', { name: 'Kit designer' }).click();
  await expect(page).toHaveURL(/\/designer$/);
  await rail.getByRole('link', { name: 'Fantasy' }).click();
  await expect(page).toHaveURL(/\/fantasy$/);
  // Not while signing in.
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

test('anyone can play with the kit designer', async ({ page }) => {
  await page.goto('/designer');
  await page.getByRole('button', { name: 'Hoops', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByLabel('Number').fill('7');
  await expect(page.getByRole('img', { name: 'My kit · Back' })).toContainText('7');
  // Saving needs an account.
  await expect(page.getByRole('link', { name: 'Save design' })).toHaveAttribute('href', '/signin');
});

test('the market lists shirts in collections: buyable first, every one on request', async ({ page }) => {
  await page.goto('/market');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shirts from collections');
  // Only collectors' real shirts (no demo pieces since 23 Oct 2026); the smoke run has none.
  await expect(page.getByText('DEMO', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'All in collections' }).click();
  await expect(page).toHaveURL(/status=all/);
});

test('a model page counts its shirts in collections and leads to them', async ({ page }) => {
  await page.goto('/shirt/acm-0607');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AC Milan 2006/07 Home');
  // Without shirts in collections (the smoke run has none) it says so and still leads to the market.
  await expect(page.getByText('Not in any collection yet')).toBeVisible();
  await page.getByRole('link', { name: 'Shirts in collections' }).click();
  await expect(page).toHaveURL(/\/market\?shirt=acm-0607/);
});

test('Scout deals shirt cards, none of them demo', async ({ page }) => {
  await page.goto('/feed');
  const card = page.locator('[aria-roledescription="shirt card"]');
  await expect(card.first()).toBeVisible({ timeout: 10000 });
  await expect(card.first()).not.toContainText('DEMO');
});

test('a shirt page is ready for search engines without JavaScript', async () => {
  // The prerendered page from the build (the dev server serves the empty shell).
  const file = 'dist/shirt/fra-98/index.html';
  test.skip(!existsSync(file), 'needs a build (npm run build)');
  const html = readFileSync(file, 'utf8');
  expect(html).toMatch(/<title>France 1998 Home[^<]*<\/title>/);
  expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/shirt\/fra-98"/);
  expect(html).toMatch(/<meta property="og:image" content="https?:\/\/[^"]+"/);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => JSON.parse(m[1]));
  expect(ld.map((x) => x['@type'])).toEqual(['Product', 'BreadcrumbList']);
  expect(ld[0]).toMatchObject({ name: 'France 1998 Home', brand: { name: 'adidas' } });
  expect(ld[1].itemListElement.at(-1)).toMatchObject({ name: 'France 1998 Home' });
});

test('the header fits wide screens in every language, even with a member’s buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1480, height: 900 });
  for (const lang of ['de', 'fr', 'en']) {
    await page.addInitScript((l) => localStorage.setItem('kv_lang', JSON.stringify(l)), lang);
    await page.goto('/library');
    await expect(page.getByRole('search').first()).toBeVisible();
    // Stand-ins for messages, notifications, avatar and "sign out" (the smoke run has no account).
    const over = await page.evaluate(() => {
      const row = document.querySelector('.app-header > div');
      const signin = row.querySelector('a.btn--primary');
      for (let i = 0; i < 3; i++) {
        const d = document.createElement('span');
        d.style.cssText = 'width:40px;height:40px;flex:none';
        row.insertBefore(d, signin);
      }
      const out = document.createElement('button');
      out.className = 'link-btn';
      out.textContent = 'Se déconnecter';
      out.style.cssText = 'font-size:12.5px;flex:none';
      row.appendChild(out);
      signin.remove();
      return document.documentElement.scrollWidth - window.innerWidth;
    });
    expect(over, lang).toBeLessThanOrEqual(0);
  }
});
