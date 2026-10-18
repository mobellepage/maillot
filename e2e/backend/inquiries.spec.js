import { expect, test } from '@playwright/test';

// "Ask anyway" on a collector's piece, end to end on the local seeded stack:
// the seller (@zurich_kits) keeps a Real Madrid 2026/27 as not for sale; the
// buyer asks without obligation, the seller replies, the buyer reads it.
const PASSWORD = 'maillot-dev-pw';

async function signIn(page, email) {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });
}

test('a collector’s piece takes inquiries: ask, reply, read', async ({ browser }) => {
  const buyer = await browser.newPage();
  await signIn(buyer, 'buyer@maillot.test');
  await buyer.goto('/u/zurich_kits');
  // The seller also lists this shirt for sale; the collection card is the one marked as a collector's piece.
  const card = buyer.getByRole('listitem').filter({ hasText: 'Real Madrid 2026/27 Home' }).filter({ hasText: 'Collector’s piece · not for sale' });
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: 'Ask anyway' }).click();
  const dialog = buyer.getByRole('dialog');
  await dialog.getByLabel('Your message').fill('Would you ever part with it?');
  await dialog.getByLabel(/What you would pay/).fill('400');
  await dialog.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(buyer.getByText('Inquiry sent to @zurich_kits.')).toBeVisible();

  const seller = await browser.newPage();
  await signIn(seller, 'seller@maillot.test');
  // Inquiries live under Messages (header button), not in the collection.
  await seller.getByRole('link', { name: /^Messages/ }).click();
  await expect(seller).toHaveURL(/\/messages$/);
  const panel = seller.getByRole('region', { name: 'Inquiries' });
  await expect(panel.getByText('“Would you ever part with it?”')).toBeVisible({ timeout: 10000 });
  await panel.getByLabel('Your reply').fill('Not this one, sorry!');
  await panel.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(seller.getByText('Reply sent.')).toBeVisible();
  await seller.close();

  await buyer.goto('/messages');
  await expect(buyer.getByRole('region', { name: 'Inquiries' }).getByText('Not this one, sorry!')).toBeVisible();
  await buyer.close();
});
