import { expect, test } from '@playwright/test';

// The kit library on the local seeded stack: browse a league, open a club,
// see its catalogue kit, and suggest a missing one.
const PASSWORD = 'maillot-dev-pw';

test('kit library: browse to a club and suggest a missing kit', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('buyer@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });

  await page.goto('/library');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kit library');
  await page.getByRole('button', { name: 'Serie A' }).click();
  await page.getByRole('link', { name: /AC Milan/ }).click();
  await expect(page).toHaveURL(/\/library\/milan$/);
  await expect(page.getByRole('heading', { name: '2006/07' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'In the market' })).toHaveAttribute('href', '/shirt/acm-0607');

  await page.getByRole('button', { name: 'Suggest a missing kit' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Season').fill('1890/91');
  await dialog.getByLabel('Kit').selectOption('european');
  await dialog.getByLabel('Maker').fill('adidas');
  await dialog.getByRole('button', { name: 'Stripes', exact: true }).click();
  await dialog.getByRole('button', { name: 'Send suggestion' }).click();
  await expect(page.getByText('Thanks! We’ll check your suggestion.')).toBeVisible();
  // Not public until an admin has checked it.
  await expect(page.getByRole('heading', { name: '1890/91' })).toHaveCount(0);
});
