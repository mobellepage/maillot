import { expect, test } from '@playwright/test';

// The home page is the app: visitors start with a search that reaches the
// kit library; members land on their cockpit instead of the pitch.
const PASSWORD = 'maillot-dev-pw';

test('the home search finds library kits and jumps to the season', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Search any shirt' }).fill('Milan 2006/07');
  const hit = page.getByRole('option', { name: /AC Milan\s*2006\/07 · Away/ });
  await expect(hit).toBeVisible();
  await hit.click();
  await expect(page).toHaveURL(/\/library\/milan#season-2006\/07$/);
  await expect(page.getByRole('heading', { name: '2006/07' })).toBeInViewport();
});

test('signed in, Discover is for discovering', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('buyer@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Hi @|Welcome back)/);
  await expect(page.getByRole('combobox', { name: 'Search any shirt' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Find kits by league' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Puzzle #\d+ · today/ })).toBeVisible();
  // Not the member's own data: that lives on My collection.
  await expect(page.getByText('Your collection', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Which shirt do you have – or want?' })).toHaveCount(0);

  // A category opens the library on that league.
  await page.getByRole('link', { name: 'La Liga', exact: true }).click();
  await expect(page).toHaveURL(/\/library\?league=La%20Liga$/);
  await expect(page.getByRole('button', { name: 'La Liga', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('Discover shows other collectors to follow', async ({ page }) => {
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Collections to discover' });
  await expect(section.getByRole('link', { name: /@zurich_kits/ }).first()).toBeVisible();
  // Visitors are asked to sign in to follow.
  await expect(section.getByRole('link', { name: 'Follow', exact: true }).first()).toHaveAttribute('href', '/signin');
});
