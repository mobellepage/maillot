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

  // A retry finds the choice of the first attempt: change it again.
  const title = page.getByRole('heading', { name: /^⭐/ });
  await title.waitFor();
  if ((await title.innerText()).includes('Ajax')) await page.getByRole('button', { name: 'Change', exact: true }).click();

  const field = page.getByRole('combobox', { name: 'Favourite team' });
  await field.waitFor({ timeout: 10000 }).catch(async () => {
    throw new Error('no favourite team field; page: ' + (await page.locator('main').innerText()).slice(0, 600).replace(/\n/g, ' / '));
  });
  await field.fill('Ajax');
  await expect(page.getByRole('listbox', { name: 'Favourite team' })).toBeVisible();
  await field.press('Enter');
  await expect(page.getByRole('heading', { name: '⭐ Ajax' })).toBeVisible();
  await expect(page.getByText(/You have 1 of \d+ kits/)).toBeVisible();
  const strip = page.getByRole('list', { name: 'All kits of Ajax' });
  await expect(strip).toBeVisible();
  await expect(strip.getByRole('link', { name: /1994\/95 · Home — in your collection/ }), (await strip.innerHTML()).slice(0, 900)).toHaveCount(1);

  // It follows to the home page cockpit.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '⭐ Ajax' })).toBeVisible();
});
