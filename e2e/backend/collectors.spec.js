import { expect, test } from '@playwright/test';

// Collector search, profiles, following and the opt-in collection value,
// against the local stack seeded by supabase/seed.sql (seller@maillot.test
// is @zurich_kits with live listings, so they can be found).
test.describe.configure({ mode: 'serial' });

const PASSWORD = 'maillot-dev-pw';

async function signIn(page, email) {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });
}

test('visitors find a collector by username and are asked to sign in to follow', async ({ page }) => {
  await page.goto('/market?q=@zurich');
  await page.getByRole('link', { name: '@zurich_kits' }).click();
  await expect(page).toHaveURL(/\/u\/zurich_kits$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('zurich_kits');
  await page.getByRole('link', { name: 'Follow', exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
});

test('a shirt in a collection opens as the member’s own shirt, not the catalogue entry', async ({ page }) => {
  await page.goto('/u/zurich_kits');
  await page.locator('a[href="/u/zurich_kits/seed-ajax-offers"]').click();
  await expect(page).toHaveURL(/\/u\/zurich_kits\/seed-ajax-offers$/);
  await expect(page.getByText('From @zurich_kits’s collection')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ajax 1994/95 Home');
  await expect(page.getByText('8/10')).toBeVisible();
  await page.getByRole('link', { name: /View in the catalogue/ }).click();
  await expect(page).toHaveURL(/\/shirt\/ajx-95$/);
});

test('a member follows and unfollows a collector', async ({ page }) => {
  await signIn(page, 'buyer@maillot.test');
  await page.goto('/u/zurich_kits');
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Following' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('1 follower')).toBeVisible();

  await page.goto('/account');
  await expect(page.getByRole('link', { name: /@zurich_kits/ })).toBeVisible();

  await page.goto('/u/zurich_kits');
  await page.getByRole('button', { name: 'Following' }).click();
  await expect(page.getByRole('button', { name: 'Follow', exact: true })).toBeVisible();
  await expect(page.getByText('0 followers')).toBeVisible();
});

test('a member picks a legend as profile picture and can go back to initials', async ({ page }) => {
  await signIn(page, 'seller@maillot.test');
  await page.goto('/account');
  await page.getByRole('button', { name: 'Choose a profile picture' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Legend 7', exact: true }).click();
  await expect(page.getByText('Profile picture saved.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Choose a profile picture' }).first().click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Legend 7', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('dialog').getByRole('button', { name: 'Initials' }).click();
  await expect(page.getByText('Profile picture saved.').first()).toBeVisible();
});

test('the collection value setting is saved and can be turned off again', async ({ page }) => {
  await signIn(page, 'seller@maillot.test');
  await page.goto('/account');
  const toggle = page.getByRole('checkbox', { name: /Show my collection value/ });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(page.getByText('Your profile now shows your collection value.')).toBeVisible();
  await page.reload();
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(page.getByText('Collection value hidden.')).toBeVisible();
  await page.reload();
  await expect(toggle).not.toBeChecked();
});
