import { expect, test } from '@playwright/test';

// Listing alerts end to end on the local seeded stack: the buyer asks to be
// told when Manchester United 2007/08 is listed in S; the seller lists it; the buyer
// finds the alert in their notifications. (No other test lists that size.)
const PASSWORD = 'maillot-dev-pw';

async function signIn(page, email) {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|passwort/i).fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: /sign in|anmelden/i }).click();
  await expect(page).toHaveURL(/\/vault$/, { timeout: 10000 });
}

test('an alert fires when the wanted shirt is listed', async ({ browser }) => {
  const buyer = await browser.newPage();
  await signIn(buyer, 'buyer@maillot.test');
  await buyer.goto('/shirt/mun-0708?size=S');
  const cta = buyer.getByRole('button', { name: 'Tell me when it’s listed' });
  const active = buyer.getByText('Alert on: S');
  // A retry finds the alert from the first attempt already in place.
  await expect(cta.or(active)).toBeVisible();
  if (await cta.isVisible()) {
    await cta.click();
    await buyer.getByRole('dialog').getByRole('button', { name: 'Set alert' }).click();
  }
  await expect(active).toBeVisible();
  await buyer.goto('/watchlist');
  await expect(buyer.getByRole('heading', { name: /Your alerts/ })).toBeVisible();

  const seller = await browser.newPage();
  await signIn(seller, 'seller@maillot.test');
  // A quick listing: the shirt goes into the seller's collection, for sale.
  await seller.goto('/sell?shirt=mun-0708&size=S');
  await seller.getByRole('button', { name: /List it quickly/ }).click();
  await seller.getByLabel('Front', { exact: true }).setInputFiles('e2e/fixtures/shirt-front.jpg');
  await seller.getByLabel('Back', { exact: true }).setInputFiles('e2e/fixtures/shirt-back.jpg');
  await seller.getByRole('button', { name: /Continue/ }).click();
  await seller.locator('input[inputmode="numeric"]').fill('650');
  await seller.getByRole('button', { name: /Review listing/ }).click();
  await seller.getByRole('button', { name: 'Publish listing' }).click();
  await expect(seller.getByRole('heading', { name: 'Your shirt is for sale' })).toBeVisible();
  await seller.close();

  await buyer.reload();
  await buyer.getByRole('button', { name: /notifications/i }).first().click();
  await expect(buyer.getByText('A shirt you want is in a collection').first()).toBeVisible({ timeout: 10000 });
  await buyer.close();
});
