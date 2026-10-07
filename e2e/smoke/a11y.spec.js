import { expect, test } from '@playwright/test';
import { expectAccessible } from '../axe.js';

// WCAG 2.2 AA on every public page, desktop and mobile. Signed-in pages are
// covered by e2e/backend/a11y.spec.js.
const PAGES = ['/', '/market', '/shirt/sui-26', '/price-index', '/sell', '/signin', '/authentication', '/developers', '/help', '/legal/terms', '/verify', '/verify/MLT-0000-0000', '/u/nobody', '/account', '/return?to=/orders'];

for (const path of PAGES) {
  test(`a11y ${path} @mobile`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.locator('#main')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectAccessible(page);
  });
}

test('the bid dialog is accessible and keeps focus inside', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/shirt/ger-26');
  const opener = page.getByRole('button', { name: 'Place bid' });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expectAccessible(page, '[role="dialog"]');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('keyboard: the skip link jumps to the page, and navigation is announced', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#main')).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Market' }).click();
  await expect(page).toHaveURL(/\/market$/);
  // Screen readers hear the new page's title, and focus starts on the new page.
  await expect(page.getByRole('status').filter({ hasText: /Market/ })).toHaveCount(1);
  await expect(page.locator('#main')).toBeFocused();
});
