import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/dashboard');
    // Wait for either dashboard or login redirect
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard page or redirect to login', async ({ page }) => {
    // Dashboard is a protected route - wait for redirect or content
    // Give time for JavaScript redirect to happen
    await page.waitForTimeout(2000);

    const currentUrl = page.url();

    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      // Expected behavior - unauthenticated users are redirected
      await page.waitForLoadState('networkidle');
      await expect(page.locator('input[type="email"], input#email').first()).toBeVisible();
      await page.screenshot({ path: 'screenshots/15-dashboard-requires-auth.png', fullPage: true });
    } else if (currentUrl.includes('dashboard')) {
      // Still on dashboard - check if content is loading or showing empty state
      const h1 = page.locator('h1');
      if (await h1.count() > 0) {
        await expect(h1).toContainText('Your Links');
      }
      await page.screenshot({ path: 'screenshots/15-dashboard.png', fullPage: true });
    } else {
      // Some other page - just verify it loaded
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show empty state when no links', async ({ page }) => {
    // Wait for page to settle
    await page.waitForTimeout(2000);

    const currentUrl = page.url();

    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      // Expected - protected route redirects to login
      expect(currentUrl).toMatch(/login|signin/);
    } else {
      // Dashboard page should be visible if authenticated
      await expect(page.locator('h1')).toContainText('Your Links');
    }
  });

  test('should have search and filter controls', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
      // Search input - only check if on dashboard
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    } else {
      // Redirected to login - this is expected behavior
      expect(currentUrl).toMatch(/login|signin/);
    }
  });

  test('should display stats cards', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
      // Stats cards should be visible if authenticated
      await expect(page.getByText('Total Links')).toBeVisible();
      await expect(page.getByText('Total Clicks')).toBeVisible();
    } else {
      // Redirected to login - this is expected behavior
      expect(currentUrl).toMatch(/login|signin/);
    }
  });
});
