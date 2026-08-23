import { expect, test } from '@playwright/test';

// Helpers
import { copy, hasE2ECredentials, localePath } from '../helpers/copy';

const e2eEmail = process.env.E2E_USER_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD;

test.describe('tasks browse', () => {
  test.skip(
    !hasE2ECredentials(),
    'Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run signed-in offer browse against a live API.',
  );

  test('signed-in user reaches the tasks catalog', async ({ page }) => {
    await page.goto(localePath('/login'));
    await page.getByLabel(copy.en.LoginPage.emailAddress).fill(e2eEmail ?? '');
    await page.getByLabel(copy.en.LoginPage.password).fill(e2ePassword ?? '');
    await page.getByRole('button', { name: copy.en.LoginPage.signIn, exact: true }).click();

    await expect(page).not.toHaveURL(/\/login/);

    await page.goto(localePath('/tasks'));

    await expect(page).toHaveURL(/\/en\/tasks\/?$/);
    await expect(page).toHaveTitle(copy.en.TasksMetadata.title);
    await expect(page.getByRole('heading', { name: copy.en.TasksPage.title })).toBeVisible();
    await expect(page.getByPlaceholder(copy.en.TasksPage.controls.searchPlaceholder)).toBeVisible();
  });
});
