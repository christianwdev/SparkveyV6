import { expect, test } from '@playwright/test';

// Helpers
import { copy, localePath } from './helpers/copy';

test.describe('landing page', () => {
  test('loads the public marketing page with key sections', async ({ page }) => {
    const response = await page.goto(localePath('/'));

    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(copy.en.HomeMetadata.title);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await expect(page.getByRole('heading', {
      name: copy.en.Landing.heroHeadline,
    })).toBeVisible();
    await expect(page.getByText(copy.en.Landing.heroDescription)).toBeVisible();

    await expect(page.getByRole('link', { name: copy.en.Landing.signIn })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.en.Landing.register })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.en.Landing.getStarted })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.en.Landing.exploreOffers })).toBeVisible();

    await expect(page.getByRole('heading', {
      name: copy.en.Landing.featuredOffers.eyebrow,
    })).toBeVisible();
    await expect(page.getByRole('heading', {
      name: copy.en.Landing.howItWorks.eyebrow,
    })).toBeVisible();
    await expect(page.getByRole('heading', {
      name: copy.en.Landing.waysToEarn.eyebrow,
    })).toBeVisible();
    await expect(page.getByRole('heading', {
      name: copy.en.Landing.faq.eyebrow,
    })).toBeVisible();
  });

  test('expands a FAQ item', async ({ page }) => {
    await page.goto(localePath('/'));

    const question = copy.en.Landing.faq.questions.whatIsSparkvey;
    await page.getByRole('heading', { name: question.title }).click();

    await expect(page.getByText(question.answer)).toBeVisible();
  });

  test('navigates from hero CTAs to auth pages', async ({ page }) => {
    await page.goto(localePath('/'));

    await page.getByRole('link', { name: copy.en.Landing.getStarted }).click();
    await expect(page).toHaveURL(/\/en\/signup\/?$/);
    await expect(page.getByRole('heading', { name: copy.en.SignupPage.title })).toBeVisible();

    await page.goto(localePath('/'));
    await page.getByRole('link', { name: copy.en.Landing.exploreOffers }).click();
    await expect(page).toHaveURL(/\/en\/login\/?$/);
    await expect(page.getByRole('heading', { name: copy.en.LoginPage.title })).toBeVisible();
  });

  test('footer links reach legal pages', async ({ page }) => {
    await page.goto(localePath('/'));

    await page.getByRole('contentinfo').getByRole('link', {
      name: copy.en.Footer.termsOfService,
    }).click();
    await expect(page).toHaveURL(/\/en\/terms-of-service\/?$/);
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();

    await page.goto(localePath('/'));
    await page.getByRole('contentinfo').getByRole('link', {
      name: copy.en.Footer.privacyPolicy,
    }).click();
    await expect(page).toHaveURL(/\/en\/privacy-policy\/?$/);
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
  });
});
