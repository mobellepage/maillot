import { expect, test } from '@playwright/test';

// Offers on collection shirts, end to end on the local seeded stack: the
// seller (@zurich_kits) has an Ajax 1994/95 open to offers; the buyer offers,
// the seller accepts, and it becomes an order the buyer pays.
const PASSWORD = 'maillot-dev-pw';

async function signIn(page, email) {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });
}

test('an offer on a collection shirt becomes an order when accepted', async ({ browser }) => {
  const buyer = await browser.newPage();
  await signIn(buyer, 'buyer@maillot.test');
  await buyer.goto('/u/zurich_kits');
  const card = buyer.getByRole('listitem').filter({ hasText: 'Ajax 1994/95 Home' });
  await card.getByRole('button', { name: 'Make an offer' }).click();
  const dialog = buyer.getByRole('dialog');
  await dialog.getByLabel('Your offer').fill('175');
  await dialog.getByRole('button', { name: 'Send offer' }).click();
  await expect(buyer.getByText('Offer sent to @zurich_kits.')).toBeVisible();

  const seller = await browser.newPage();
  await signIn(seller, 'seller@maillot.test');
  const offers = seller.getByRole('region', { name: 'Offers' });
  await expect(offers.getByText('CHF 175')).toBeVisible({ timeout: 10000 });
  await offers.getByRole('button', { name: 'Accept' }).click();
  await seller.getByRole('dialog').getByRole('button', { name: 'Accept' }).click();
  await expect(offers.getByRole('link', { name: 'View order' })).toBeVisible();
  await seller.close();

  await buyer.goto('/vault');
  await buyer.getByRole('link', { name: 'Pay now' }).click();
  await expect(buyer).toHaveURL(/\/orders\//);
  await buyer.close();
});
