import { expect, test } from '@playwright/test';

// Helpers
import { copy, localePath } from '../helpers/copy';

const OFFER_PATHS = [
  '/tasks',
  '/surveys',
] as const;

test.describe('offer pages without a session', () => {
  for (const path of OFFER_PATHS) {
    test(`${path} redirects guests to login`, async ({ page }) => {
      await page.goto(localePath(path));

      await expect(page).toHaveURL(/\/en\/login\/?$/);
      await expect(page.getByRole('heading', { name: copy.en.LoginPage.title })).toBeVisible();
      await expect(page.getByLabel(copy.en.LoginPage.emailAddress)).toBeVisible();
    });
  }

  test('explore-offers CTA from the landing page sends guests to login', async ({ page }) => {
    await page.goto(localePath('/'));
    await page.getByRole('link', { name: copy.en.Landing.exploreOffers }).click();

    await expect(page).toHaveURL(/\/en\/login\/?$/);
  });
});
