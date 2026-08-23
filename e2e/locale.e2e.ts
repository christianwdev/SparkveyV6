import { expect, test } from '@playwright/test';

// Helpers
import { copy, localePath } from './helpers/copy';

test.describe('locale routing', () => {
  test('root path redirects to the default locale', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('unprefixed auth paths pick up the default locale', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/en\/login\/?$/);

    await page.goto('/signup');
    await expect(page).toHaveURL(/\/en\/signup\/?$/);
  });

  test('Spanish landing uses Spanish copy and html lang', async ({ page }) => {
    const response = await page.goto(localePath('/', 'es'));

    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/es\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page).toHaveTitle(copy.es.HomeMetadata.title);
    await expect(page.getByRole('heading', {
      name: copy.es.Landing.heroHeadline,
    })).toBeVisible();
  });

  test('language switcher changes the locale from the footer', async ({ page }) => {
    await page.goto(localePath('/'));

    await page.getByRole('button', { name: copy.en.Footer.language }).click();
    await page.getByRole('link', { name: copy.en.Footer.spanish }).click();

    await expect(page).toHaveURL(/\/es\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', {
      name: copy.es.Landing.heroHeadline,
    })).toBeVisible();
  });
});
