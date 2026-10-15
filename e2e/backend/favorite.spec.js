import { expect, test } from '@playwright/test';

// The favourite team on the local seeded stack: @zurich_kits (seller) owns
// an Ajax 1994/95; picking Ajax shows all its kits with that one lit up.
const PASSWORD = 'maillot-dev-pw';

test('picking a favourite team shows its kits, the owned one lit up', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('seller@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });

  const field = page.getByRole('combobox', { name: 'Favourite team' });
  await field.waitFor({ timeout: 10000 }).catch(async () => {
    throw new Error('no favourite team field; page: ' + (await page.locator('main').innerText()).slice(0, 600).replace(/\n/g, ' / '));
  });
  await field.fill('Ajax');
  await page.getByRole('listbox', { name: 'Favourite team' }).getByRole('option', { name: /^Ajax/ }).click();
  await expect(page.getByRole('heading', { name: '⭐ Ajax' })).toBeVisible();
  await expect(page.getByText(/You have 1 of \d+ kits/)).toBeVisible();
  await expect(page.getByRole('link', { name: '1994/95 · Home — in your collection' })).toBeVisible();
  await expect(page.getByRole('link', { name: /still missing$/ }).first()).toBeVisible();

  // It follows to the home page cockpit.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '⭐ Ajax' })).toBeVisible();
});
