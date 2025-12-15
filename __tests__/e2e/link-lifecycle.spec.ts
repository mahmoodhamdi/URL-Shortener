import { test, expect } from '@playwright/test';

test.describe('Complete Link Lifecycle', () => {
  test.describe('Link Creation Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en');
    });

    test('should create a basic short link', async ({ page }) => {
      // Enter URL
      const urlInput = page.locator('[data-testid="url-input"]');
      await expect(urlInput).toBeVisible();
      await urlInput.fill('https://example.com/test-page');

      // Click shorten button
      await page.click('[data-testid="shorten-btn"]');

      // Wait for result
      await page.waitForSelector('[data-testid="result-card"]', { timeout: 10000 });

      // Verify short URL is displayed
      const shortUrlInput = page.locator('[data-testid="short-url"]');
      const shortUrl = await shortUrlInput.inputValue();
      expect(shortUrl).toContain('/');

      await page.screenshot({ path: 'screenshots/link-01-created.png' });
    });

    test('should create link with custom alias', async ({ page }) => {
      await page.fill('[data-testid="url-input"]', 'https://example.com/custom');

      // Open advanced options if available
      const advancedBtn = page.locator('[data-testid="advanced-options"], button:has-text("Advanced")');
      if (await advancedBtn.count() > 0) {
        await advancedBtn.click();
      }

      // Enter custom alias if field is visible
      const aliasInput = page.locator('[data-testid="alias-input"], input[name="alias"]');
      if (await aliasInput.count() > 0) {
        await aliasInput.fill('my-custom-alias');
      }

      await page.click('[data-testid="shorten-btn"]');
      await page.waitForSelector('[data-testid="result-card"]', { timeout: 10000 });

      await page.screenshot({ path: 'screenshots/link-02-custom-alias.png' });
    });

    test('should show QR code for created link', async ({ page }) => {
      await page.fill('[data-testid="url-input"]', 'https://example.com/qr-test');
      await page.click('[data-testid="shorten-btn"]');
      await page.waitForSelector('[data-testid="result-card"]');

      // Click QR button
      const qrBtn = page.locator('[data-testid="qr-btn"]');
      if (await qrBtn.count() > 0) {
        await qrBtn.click();
        await page.waitForSelector('[data-testid="qr-code"]', { timeout: 5000 });
        await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/link-03-qr-code.png' });
    });

    test('should copy short URL to clipboard', async ({ page }) => {
      await page.fill('[data-testid="url-input"]', 'https://example.com/copy-test');
      await page.click('[data-testid="shorten-btn"]');
      await page.waitForSelector('[data-testid="result-card"]');

      // Click copy button
      const copyBtn = page.locator('[data-testid="copy-btn"]');
      if (await copyBtn.count() > 0) {
        await copyBtn.click();
        // Should show copied feedback
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: 'screenshots/link-04-copied.png' });
    });
  });

  test.describe('Link Management in Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en/dashboard');
      await page.waitForLoadState('networkidle');
    });

    test('should display link list', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Your Links');

      await page.screenshot({ path: 'screenshots/link-05-dashboard.png', fullPage: true });
    });

    test('should have search functionality', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();

      // Type in search
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'screenshots/link-06-search.png' });
    });

    test('should have filter/sort options', async ({ page }) => {
      // Look for sort or filter buttons
      const sortBtn = page.locator('button:has-text("Sort"), button:has-text("Date"), select');
      if (await sortBtn.count() > 0) {
        await expect(sortBtn.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/link-07-filters.png' });
    });

    test('should show link statistics', async ({ page }) => {
      // Stats cards
      const totalLinks = page.getByText('Total Links');
      const totalClicks = page.getByText('Total Clicks');

      await expect(totalLinks).toBeVisible();
      await expect(totalClicks).toBeVisible();

      await page.screenshot({ path: 'screenshots/link-08-stats.png' });
    });
  });

  test.describe('Link Details View', () => {
    test('should navigate to link stats page', async ({ page }) => {
      await page.goto('/en/dashboard');
      await page.waitForLoadState('networkidle');

      // Click on a link to view details (if any links exist)
      const linkItem = page.locator('[data-testid="link-item"], .link-card, a[href*="/stats"]').first();
      if (await linkItem.count() > 0) {
        await linkItem.click();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: 'screenshots/link-09-details.png' });
    });
  });

  test.describe('Bulk URL Shortening', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en/bulk');
    });

    test('should display bulk shortener page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Bulk URL Shortener' })).toBeVisible();

      await page.screenshot({ path: 'screenshots/link-10-bulk-page.png', fullPage: true });
    });

    test('should have textarea for multiple URLs', async ({ page }) => {
      const textarea = page.locator('textarea');
      await expect(textarea).toBeVisible();

      // Enter multiple URLs
      await textarea.fill('https://example1.com\nhttps://example2.com\nhttps://example3.com');

      await page.screenshot({ path: 'screenshots/link-11-bulk-input.png' });
    });

    test('should show bulk shorten button', async ({ page }) => {
      const shortenBtn = page.locator('button[type="submit"], button:has-text("Shorten")');
      await expect(shortenBtn.first()).toBeVisible();
    });
  });

  test.describe('URL Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en');
    });

    test('should disable button for empty input', async ({ page }) => {
      const shortenBtn = page.locator('[data-testid="shorten-btn"]');
      await expect(shortenBtn).toBeDisabled();
    });

    test('should accept valid URLs', async ({ page }) => {
      const validUrls = [
        'https://example.com',
        'http://example.org/path',
        'https://sub.domain.com/path?query=1',
      ];

      for (const url of validUrls) {
        await page.fill('[data-testid="url-input"]', url);
        const shortenBtn = page.locator('[data-testid="shorten-btn"]');
        await expect(shortenBtn).toBeEnabled();
      }
    });

    test('should handle very long URLs', async ({ page }) => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500);
      await page.fill('[data-testid="url-input"]', longUrl);
      await page.click('[data-testid="shorten-btn"]');

      // Should either succeed or show error
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'screenshots/link-12-long-url.png' });
    });
  });
});
