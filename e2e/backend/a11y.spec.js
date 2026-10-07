import { expect, test } from '@playwright/test';
import { expectAccessible } from '../axe.js';

// WCAG 2.2 AA on the signed-in pages (public pages: e2e/smoke/a11y.spec.js).
// Read-only, so it can run alongside the marketplace suite.
const PASSWORD = 'maillot-dev-pw';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('seller@maillot.test');
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });
});

for (const path of ['/vault', '/watchlist', '/orders', '/vault/add', '/sell?shirt=ger-26&size=M', '/welcome?step=username', '/account']) {
  test(`a11y signed in ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('#main')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectAccessible(page);
  });
}

test('a11y notifications panel', async ({ page }) => {
  await page.getByRole('button', { name: /notifications/i }).first().click();
  await expectAccessible(page);
});
