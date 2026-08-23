import { expect, test } from '@playwright/test';

// Helpers
import { copy, localePath } from './helpers/copy';

const PUBLIC_PAGES = [
  {
    path: '/',
    title: copy.en.HomeMetadata.title,
  },
  {
    path: '/login',
    title: copy.en.LoginMetadata.title,
  },
  {
    path: '/signup',
    title: copy.en.SignupMetadata.title,
  },
  {
    path: '/forgot-password',
    title: copy.en.ForgotPasswordMetadata.title,
  },
  {
    path: '/terms-of-service',
    title: copy.en.TermsOfServiceMetadata.title,
  },
  {
    path: '/privacy-policy',
    title: copy.en.PrivacyPolicyMetadata.title,
  },
  {
    path: '/leaderboard',
    title: copy.en.LeaderboardMetadata.title,
  },
] as const;

test.describe('public page smoke', () => {
  for (const pageInfo of PUBLIC_PAGES) {
    test(`${pageInfo.path} returns a successful document`, async ({ page }) => {
      const response = await page.goto(localePath(pageInfo.path));

      expect(response?.ok()).toBeTruthy();
      await expect(page).toHaveTitle(pageInfo.title);
      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('terms of service renders the legal heading', async ({ page }) => {
    await page.goto(localePath('/terms-of-service'));

    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '1. Eligibility' })).toBeVisible();
  });

  test('privacy policy renders the legal heading', async ({ page }) => {
    await page.goto(localePath('/privacy-policy'));

    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '1. Information We Collect' })).toBeVisible();
  });

  test('leaderboard renders without an API', async ({ page }) => {
    await page.goto(localePath('/leaderboard'));

    await expect(page.getByRole('heading', { name: /Monthly Leaderboard/ })).toBeVisible();
  });
});
