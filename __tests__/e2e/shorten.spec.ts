import { test, expect } from '@playwright/test';

test.describe('URL Shortening', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
  });

  test('should display home page with URL shortener form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Shorten Your URLs');
    await expect(page.locator('[data-testid="url-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="shorten-btn"]')).toBeVisible();

    await page.screenshot({ path: 'screenshots/01-home-en.png', fullPage: true });
  });

  test('should shorten a URL and display result', async ({ page }) => {
    // Enter URL
    await page.fill('[data-testid="url-input"]', 'https://example.com/very-long-url-path');
    await page.screenshot({ path: 'screenshots/02-url-entered.png' });

    // Click shorten button
    await page.click('[data-testid="shorten-btn"]');

    // Wait for result
    await page.waitForSelector('[data-testid="result-card"]', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/03-result.png' });

    // Verify short URL is displayed
    const shortUrl = await page.locator('[data-testid="short-url"]').inputValue();
    expect(shortUrl).toContain('/');
  });

  test('should show QR code when clicking QR button', async ({ page }) => {
    // Shorten a URL first
    await page.fill('[data-testid="url-input"]', 'https://example.com');
    await page.click('[data-testid="shorten-btn"]');
    await page.waitForSelector('[data-testid="result-card"]');

    // Click QR button
    await page.click('[data-testid="qr-btn"]');

    // Wait for QR code to load
    await page.waitForSelector('[data-testid="qr-code"]', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/04-qr-code.png' });

    // Verify QR code image is present
    await expect(page.locator('[data-testid="qr-code"] img')).toBeVisible();
  });

  test('should validate URL input', async ({ page }) => {
    // Try to submit without URL
    const shortenBtn = page.locator('[data-testid="shorten-btn"]');
    await expect(shortenBtn).toBeDisabled();
  });
});
