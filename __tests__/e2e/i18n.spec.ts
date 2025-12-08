import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('English version loads correctly', async ({ page }) => {
    await page.goto('/en');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(html).toHaveAttribute('dir', 'ltr');

    await expect(page.locator('h1')).toContainText('Shorten Your URLs');

    await page.screenshot({ path: 'screenshots/05-home-en.png', fullPage: true });
  });

  test('Arabic version loads with RTL', async ({ page }) => {
    await page.goto('/ar');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'rtl');

    await expect(page.locator('h1')).toContainText('اختصر روابطك');

    await page.screenshot({ path: 'screenshots/06-home-ar.png', fullPage: true });
  });

  test('language switcher works', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('h1')).toContainText('Shorten Your URLs');

    // The URL should change when navigating to Arabic
    await page.goto('/ar');
    await expect(page.locator('h1')).toContainText('اختصر روابطك');
  });

  test('all pages have correct translations', async ({ page }) => {
    // Dashboard - English
    await page.goto('/en/dashboard');
    await expect(page.locator('h1')).toContainText('Your Links');

    // Dashboard - Arabic
    await page.goto('/ar/dashboard');
    await expect(page.locator('h1')).toContainText('روابطك');

    // Bulk - English
    await page.goto('/en/bulk');
    await expect(page.locator('h1, [class*="CardTitle"]').first()).toContainText('Bulk URL Shortener');

    // Bulk - Arabic
    await page.goto('/ar/bulk');
    await expect(page.locator('h1, [class*="CardTitle"]').first()).toContainText('اختصار متعدد');
  });
});
