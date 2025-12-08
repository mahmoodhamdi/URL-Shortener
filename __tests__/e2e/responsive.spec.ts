import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('Mobile layout - English', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en');

    // Header should be visible
    await expect(page.locator('header')).toBeVisible();

    // Mobile nav should be visible at bottom
    await expect(page.locator('nav.fixed')).toBeVisible();

    await page.screenshot({ path: 'screenshots/07-mobile-en.png', fullPage: true });
  });

  test('Mobile layout - Arabic RTL', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/ar');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    await page.screenshot({ path: 'screenshots/08-mobile-ar.png', fullPage: true });
  });

  test('Tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/en');

    await page.screenshot({ path: 'screenshots/09-tablet-en.png', fullPage: true });
  });

  test('Desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/en');

    await page.screenshot({ path: 'screenshots/10-desktop-en.png', fullPage: true });
  });

  test('Dashboard responsive', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en/dashboard');
    await page.screenshot({ path: 'screenshots/11-dashboard-mobile.png', fullPage: true });

    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/en/dashboard');
    await page.screenshot({ path: 'screenshots/12-dashboard-desktop.png', fullPage: true });
  });

  test('Bulk shortener responsive', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en/bulk');
    await page.screenshot({ path: 'screenshots/13-bulk-mobile.png', fullPage: true });

    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/en/bulk');
    await page.screenshot({ path: 'screenshots/14-bulk-desktop.png', fullPage: true });
  });
});
