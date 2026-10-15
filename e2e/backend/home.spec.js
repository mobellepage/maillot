import { expect, test } from '@playwright/test';

// The home page is the app: visitors start with a search that reaches the
// kit library; members land on their cockpit instead of the pitch.
const PASSWORD = 'maillot-dev-pw';

test('the home search finds library kits and jumps to the season', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Search any shirt' }).fill('Milan 2006/07');
  const hit = page.getByRole('option', { name: /AC Milan 2006\/07\s*Away/ });
  await expect(hit).toBeVisible();
  await hit.click();
  await expect(page).toHaveURL(/\/library\/milan#season-2006\/07$/);
  await expect(page.getByRole('heading', { name: '2006/07' })).toBeInViewport();
});

test('signed in, the home page is the member cockpit', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('buyer@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Hi @|Welcome back)/);
  await expect(page.getByText('Your collection', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Puzzle #\d+ · today/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Explore' }).getByRole('link', { name: /Kit library/ })).toBeVisible();
  // No pitch for members.
  await expect(page.getByRole('heading', { name: 'Which shirt do you have – or want?' })).toHaveCount(0);
});
