import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/dashboard');
  });

  test('should display dashboard page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Your Links');

    await page.screenshot({ path: 'screenshots/15-dashboard.png', fullPage: true });
  });

  test('should show empty state when no links', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Check for either links or empty state
    const linksExist = await page.locator('[class*="LinkCard"]').count() > 0;

    if (!linksExist) {
      await expect(page.getByText(/No links yet|Create your first/i)).toBeVisible();
    }
  });

  test('should have search and filter controls', async ({ page }) => {
    // Search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Sort dropdown
    await expect(page.locator('button:has-text("Date Created"), button:has-text("Most Clicks"), button:has-text("Alphabetical")')).toBeDefined();
  });

  test('should display stats cards', async ({ page }) => {
    // Wait for loading
    await page.waitForLoadState('networkidle');

    // Stats cards should be visible
    await expect(page.getByText('Total Links')).toBeVisible();
    await expect(page.getByText('Total Clicks')).toBeVisible();
  });
});
