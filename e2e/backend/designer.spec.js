import { expect, test } from '@playwright/test';

// The kit designer on the local seeded stack: design, save, open the shared
// page, delete.
const PASSWORD = 'maillot-dev-pw';

test('a member designs a kit, saves it and opens its share page', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('buyer@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });

  await page.goto('/designer');
  const name = 'Test kit ' + Date.now();
  await page.getByLabel('Name of the design').fill(name);
  await page.getByRole('button', { name: 'Hoops', exact: true }).click();
  await page.getByRole('button', { name: 'Polo', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('yamal');
  await expect(page.getByRole('img', { name: name + ' · Back' })).toBeVisible();
  await page.getByRole('button', { name: 'Save design' }).click();
  await expect(page).toHaveURL(/\/designer\?id=[0-9a-f-]{36}$/);
  const id = new URL(page.url()).searchParams.get('id');

  await page.goto('/design/' + id);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  await expect(page.getByRole('img', { name: name + ' · Front' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();

  await page.goto('/designer');
  const mine = page.getByRole('listitem').filter({ hasText: name });
  page.once('dialog', (d) => d.accept());
  await mine.getByRole('button', { name: 'Delete' }).click();
  await expect(mine).toHaveCount(0);
});
