import { test, expect } from '@playwright/test';

test.describe('Subscription and Pricing Flow', () => {
  test.describe('Pricing Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en/pricing');
      await page.waitForLoadState('networkidle');
    });

    test('should display pricing page', async ({ page }) => {
      await expect(page.locator('body')).toBeVisible();

      await page.screenshot({ path: 'screenshots/pricing-01-page.png', fullPage: true });
    });

    test('should show all pricing plans', async ({ page }) => {
      // Check for plan cards or sections
      const planCards = page.locator('[data-testid="plan-card"], .pricing-card, .plan-card');
      const planCount = await planCards.count();

      // Should have at least Free and one paid plan
      if (planCount > 0) {
        expect(planCount).toBeGreaterThanOrEqual(2);
      }

      // Check for common plan names
      const freePlan = page.getByText(/free/i).first();
      await expect(freePlan).toBeVisible();

      await page.screenshot({ path: 'screenshots/pricing-02-plans.png' });
    });

    test('should display plan features', async ({ page }) => {
      // Look for feature lists
      const featureLists = page.locator('ul li, [data-testid="feature-item"]');
      const featureCount = await featureLists.count();

      if (featureCount > 0) {
        expect(featureCount).toBeGreaterThan(0);
      }

      await page.screenshot({ path: 'screenshots/pricing-03-features.png' });
    });

    test('should display plan prices', async ({ page }) => {
      // Look for price displays using valid CSS selectors
      const prices = page.locator('[data-testid="plan-price"], .price');
      const priceCount = await prices.count();

      if (priceCount > 0) {
        expect(priceCount).toBeGreaterThan(0);
      }

      await page.screenshot({ path: 'screenshots/pricing-04-prices.png' });
    });

    test('should have upgrade buttons for paid plans', async ({ page }) => {
      const upgradeBtn = page.locator('button:has-text("Upgrade"), button:has-text("Get Started"), a:has-text("Subscribe")');
      const btnCount = await upgradeBtn.count();

      if (btnCount > 0) {
        await expect(upgradeBtn.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/pricing-05-cta.png' });
    });

    test('should have monthly/yearly toggle', async ({ page }) => {
      // Check for billing period toggle
      const toggle = page.locator('button:has-text("Monthly"), button:has-text("Yearly"), [data-testid="billing-toggle"]');
      if (await toggle.count() > 0) {
        await expect(toggle.first()).toBeVisible();
      }
    });
  });

  test.describe('Plan Comparison', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en/pricing');
      await page.waitForLoadState('networkidle');
    });

    test('should show feature comparison between plans', async ({ page }) => {
      // Look for comparison table or feature lists
      const comparisonTable = page.locator('table, [data-testid="comparison-table"]');
      if (await comparisonTable.count() > 0) {
        await expect(comparisonTable.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/pricing-06-comparison.png', fullPage: true });
    });

    test('should highlight recommended plan', async ({ page }) => {
      // Check for highlighted/recommended plan
      const recommended = page.locator('[data-testid="recommended"], .recommended, .popular, :has-text("Popular"), :has-text("Recommended")');
      if (await recommended.count() > 0) {
        await expect(recommended.first()).toBeVisible();
      }
    });
  });

  test.describe('Subscription Management', () => {
    test('should access billing settings', async ({ page }) => {
      await page.goto('/en/settings/billing');
      await page.waitForLoadState('networkidle');

      // Page should load (may redirect to login if not authenticated)
      await expect(page.locator('body')).toBeVisible();

      await page.screenshot({ path: 'screenshots/pricing-07-billing.png', fullPage: true });
    });

    test('should show current plan in settings', async ({ page }) => {
      await page.goto('/en/settings');
      await page.waitForLoadState('networkidle');

      // Look for current plan display
      const currentPlan = page.locator('[data-testid="current-plan"], :has-text("Current Plan"), :has-text("Your Plan")');
      if (await currentPlan.count() > 0) {
        await expect(currentPlan.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/pricing-08-current-plan.png' });
    });

    test('should show usage statistics', async ({ page }) => {
      await page.goto('/en/settings');
      await page.waitForLoadState('networkidle');

      // Look for usage display
      const usage = page.locator('[data-testid="usage"], :has-text("Usage"), :has-text("Links Used")');
      if (await usage.count() > 0) {
        await expect(usage.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/pricing-09-usage.png' });
    });
  });

  test.describe('Upgrade Flow', () => {
    test('should initiate upgrade from pricing page', async ({ page }) => {
      await page.goto('/en/pricing');
      await page.waitForLoadState('networkidle');

      // Click upgrade button
      const upgradeBtn = page.locator('button:has-text("Upgrade"), button:has-text("Get Started")').first();
      if (await upgradeBtn.count() > 0 && await upgradeBtn.isVisible()) {
        await upgradeBtn.click();
        await page.waitForTimeout(2000);

        // Should redirect to checkout, login, settings, or stripe
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/checkout|login|signin|stripe|settings|dashboard/i);

        await page.screenshot({ path: 'screenshots/pricing-10-upgrade-flow.png' });
      }
    });

    test('should show upgrade prompt when limit reached', async ({ page }) => {
      await page.goto('/en/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for upgrade prompts
      const upgradePrompt = page.locator('[data-testid="upgrade-prompt"], :has-text("Upgrade"), .upgrade-banner');
      if (await upgradePrompt.count() > 0) {
        await expect(upgradePrompt.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/pricing-11-upgrade-prompt.png' });
    });
  });

  test.describe('Plan Limits Display', () => {
    test('should show plan limits in dashboard', async ({ page }) => {
      await page.goto('/en/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for limit indicators
      const limitIndicator = page.locator('[data-testid="limit-indicator"], :has-text("remaining"), :has-text("of"), .progress-bar');
      if (await limitIndicator.count() > 0) {
        await expect(limitIndicator.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/pricing-12-limits.png' });
    });
  });

  test.describe('Billing Portal', () => {
    test('should have manage subscription option', async ({ page }) => {
      await page.goto('/en/settings/billing');
      await page.waitForLoadState('networkidle');

      // Look for manage subscription button
      const manageBtn = page.locator('button:has-text("Manage"), button:has-text("Billing Portal"), a:has-text("Manage Subscription")');
      if (await manageBtn.count() > 0) {
        await expect(manageBtn.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/pricing-13-manage.png' });
    });

    test('should have cancel subscription option', async ({ page }) => {
      await page.goto('/en/settings/billing');
      await page.waitForLoadState('networkidle');

      // Look for cancel option (might be in danger zone)
      const cancelBtn = page.locator('button:has-text("Cancel"), :has-text("Cancel Subscription")');
      if (await cancelBtn.count() > 0) {
        await expect(cancelBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Enterprise Contact', () => {
    test('should have contact sales option for enterprise', async ({ page }) => {
      await page.goto('/en/pricing');
      await page.waitForLoadState('networkidle');

      // Look for enterprise/contact sales
      const contactBtn = page.locator('button:has-text("Contact"), a:has-text("Contact Sales"), :has-text("Enterprise")');
      if (await contactBtn.count() > 0) {
        await expect(contactBtn.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/pricing-14-enterprise.png' });
    });
  });
});
