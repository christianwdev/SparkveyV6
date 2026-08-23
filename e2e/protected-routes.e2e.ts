import { expect, test } from '@playwright/test';

// Helpers
import { copy, localePath } from './helpers/copy';

const AUTH_REQUIRED_PATHS = [
  '/tasks',
  '/surveys',
  '/redeem',
  '/profile',
] as const;

test.describe('protected routes without a session', () => {
  for (const path of AUTH_REQUIRED_PATHS) {
    test(`${path} redirects guests to login`, async ({ page }) => {
      await page.goto(localePath(path));

      await expect(page).toHaveURL(/\/en\/login\/?$/);
      await expect(page.getByRole('heading', { name: copy.en.LoginPage.title })).toBeVisible();
      await expect(page.getByLabel(copy.en.LoginPage.emailAddress)).toBeVisible();
    });
  }
});
