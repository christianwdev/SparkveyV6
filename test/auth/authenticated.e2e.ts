import { expect, test } from '@playwright/test';

// Helpers
import { copy, hasE2ECredentials, localePath } from '../helpers/copy';

const e2eEmail = process.env.E2E_USER_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD;

test.describe('authenticated flows', () => {
  test.skip(
    !hasE2ECredentials(),
    'Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run signed-in flows against a live API.',
  );

  test('signs in and reaches the logged-in home', async ({ page }) => {
    await page.goto(localePath('/login'));
    await page.getByLabel(copy.en.LoginPage.emailAddress).fill(e2eEmail ?? '');
    await page.getByLabel(copy.en.LoginPage.password).fill(e2ePassword ?? '');
    await page.getByRole('button', { name: copy.en.LoginPage.signIn, exact: true }).click();

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('link', { name: copy.en.Landing.signIn })).toHaveCount(0);
  });
});
