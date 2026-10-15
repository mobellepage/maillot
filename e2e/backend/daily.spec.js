import { expect, test } from '@playwright/test';

// The daily puzzle on the local seeded stack: today's kit comes from the
// library schedule; play it to the end, share, and find it finished after a reload.
test('the daily shirt puzzle can be played to the end and shared', async ({ page }) => {
  await page.goto('/daily');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Daily shirt puzzle');
  for (let i = 1; i <= 5; i++) {
    const button = page.getByRole('button', { name: `Guess (${i}/5)` });
    await expect(button.or(page.getByRole('button', { name: 'Share result' }))).toBeVisible();
    if (!(await button.isVisible())) break; // solved early by chance
    // Type a few letters, take the first suggestion with Enter.
    const field = page.getByRole('combobox', { name: 'Club' });
    await field.fill(['Ba', 'Ju', 'Ar', 'Ch', 'Li'][i - 1]);
    await expect(page.getByRole('listbox', { name: 'Club' })).toBeVisible();
    await field.press('Enter');
    await expect(page.getByRole('listbox', { name: 'Club' })).toHaveCount(0);
    await page.getByLabel('Season', { exact: true }).selectOption({ index: 1 });
    await button.click();
  }
  await expect(page.getByRole('button', { name: 'Share result' })).toBeVisible();
  // The answer links to the kit in the library.
  await expect(page.getByRole('link', { name: /\d{4}.* · / })).toHaveAttribute('href', /^\/library\/[a-z0-9-]+#season-/);
  await expect(page.getByText('Played').locator('..')).toContainText('1');
  // Coming back the same day shows the finished puzzle, not a new one.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Share result' })).toBeVisible();
});
