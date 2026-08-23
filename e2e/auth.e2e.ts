import { expect, test } from '@playwright/test';

// Helpers
import { copy, localePath } from './helpers/copy';

test.describe('authentication pages', () => {
  test('login page renders the form and Google sign-in', async ({ page }) => {
    const response = await page.goto(localePath('/login'));

    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(copy.en.LoginMetadata.title);
    await expect(page.getByRole('heading', { name: copy.en.LoginPage.title })).toBeVisible();
    await expect(page.getByLabel(copy.en.LoginPage.emailAddress)).toBeVisible();
    await expect(page.getByLabel(copy.en.LoginPage.password)).toBeVisible();
    await expect(page.getByRole('button', { name: copy.en.LoginPage.signIn })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.en.LoginPage.signInWithGoogle })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.en.LoginPage.forgotPassword })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.en.LoginPage.joinToday })).toBeVisible();
  });

  test('login empty submit shows client-side validation', async ({ page }) => {
    await page.goto(localePath('/login'));
    await page.getByRole('button', { name: copy.en.LoginPage.signIn }).click();

    await expect(page.getByText(copy.en.LoginPage.errors.emailRequired)).toBeVisible();
    await expect(page.getByText(copy.en.LoginPage.errors.passwordRequired)).toBeVisible();
    await expect(page).toHaveURL(/\/en\/login\/?$/);
  });

  test('login links to signup and forgot password', async ({ page }) => {
    await page.goto(localePath('/login'));

    await page.getByRole('link', { name: copy.en.LoginPage.joinToday }).click();
    await expect(page).toHaveURL(/\/en\/signup\/?$/);

    await page.goto(localePath('/login'));
    await page.getByRole('link', { name: copy.en.LoginPage.forgotPassword }).click();
    await expect(page).toHaveURL(/\/en\/forgot-password\/?$/);
  });

  test('signup page renders the first step', async ({ page }) => {
    const response = await page.goto(localePath('/signup'));

    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(copy.en.SignupMetadata.title);
    await expect(page.getByRole('heading', { name: copy.en.SignupPage.title })).toBeVisible();
    await expect(page.getByLabel(copy.en.SignupPage.emailAddress)).toBeVisible();
    await expect(page.getByLabel(copy.en.SignupPage.password, { exact: true })).toBeVisible();
    await expect(page.getByLabel(copy.en.SignupPage.confirmPassword)).toBeVisible();
    await expect(page.getByRole('button', { name: copy.en.SignupPage.continue })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.en.SignupPage.signUpWithGoogle })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.en.SignupPage.signInNow })).toBeVisible();
  });

  test('signup continue with an invalid email shows a field error', async ({ page }) => {
    await page.goto(localePath('/signup'));
    await page.getByLabel(copy.en.SignupPage.emailAddress).fill('not-an-email');
    await page.getByRole('button', { name: copy.en.SignupPage.continue }).click();

    await expect(page.getByText(copy.en.SignupPage.errors.emailInvalid)).toBeVisible();
    await expect(page).toHaveURL(/\/en\/signup\/?$/);
  });

  test('forgot password page validates an empty submit', async ({ page }) => {
    const response = await page.goto(localePath('/forgot-password'));

    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(copy.en.ForgotPasswordMetadata.title);
    await expect(page.getByRole('heading', { name: copy.en.ForgotPasswordPage.title })).toBeVisible();
    await expect(page.getByLabel(copy.en.ForgotPasswordPage.emailAddress)).toBeVisible();

    await page.getByRole('button', { name: copy.en.ForgotPasswordPage.sendResetEmail }).click();

    await expect(page.getByText(copy.en.ForgotPasswordPage.errors.emailRequired)).toBeVisible();
    await expect(page).toHaveURL(/\/en\/forgot-password\/?$/);
  });
});
