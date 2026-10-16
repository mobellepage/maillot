import { expect, test } from '@playwright/test';

// Listing a shirt from the library without photos: pick the club, tap the
// kit, add a flock, save — it shows the library picture, "own photos still to come".
const PASSWORD = 'maillot-dev-pw';

test('a shirt listed from the library without photos', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('buyer@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });

  await page.goto('/vault/add/library');
  const club = page.getByRole('combobox', { name: 'Club or national team' });
  await club.fill('Milan');
  await expect(page.getByRole('listbox', { name: 'Club or national team' })).toBeVisible();
  await club.press('Enter');
  await page.getByLabel('Season, e.g. 2018').fill('2006/07');
  await page.getByRole('button', { name: /^Choose AC Milan 2006\/07 · Home$/ }).click();
  await page.getByRole('button', { name: 'Player name & number' }).click();
  await page.getByLabel('Name').fill('Kaká');
  await page.getByLabel('Number').fill('22');
  await page.getByRole('button', { name: 'Add to my collection' }).click();

  await expect(page).toHaveURL(/\/vault\/item\//, { timeout: 10000 });
  await expect(page.getByText('Own photos still to come').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /AC Milan 2006\/07 Home/ })).toBeVisible();
});
