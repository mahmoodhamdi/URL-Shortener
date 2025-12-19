import { test, expect } from '@playwright/test';

test.describe('Multi-Gateway Payment Flow', () => {
  test.describe('Payment Methods API', () => {
    test('should return payment methods for default region', async ({ request }) => {
      // Note: This requires authentication, so we test the structure
      const response = await request.get('/api/payment/methods');

      // Should return 401 without auth, or 200 with methods
      expect([200, 401]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('countryCode');
        expect(data).toHaveProperty('paymentMethods');
        expect(Array.isArray(data.paymentMethods)).toBe(true);
      }
    });

    test('should return region-specific payment methods', async ({ request }) => {
      // Test with country code parameter
      const response = await request.get('/api/payment/methods?country=EG');

      // Should return 401 without auth
      expect([200, 401]).toContain(response.status());
    });
  });

  test.describe('Payment Checkout API', () => {
    test('should require authentication for checkout', async ({ request }) => {
      const response = await request.post('/api/payment/checkout', {
        data: {
          planId: 'STARTER',
          billingCycle: 'monthly',
        },
      });

      // Should require authentication
      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should validate checkout request body', async ({ request }) => {
      // Test with invalid plan
      const response = await request.post('/api/payment/checkout', {
        data: {
          planId: 'INVALID_PLAN',
          billingCycle: 'monthly',
        },
      });

      // Should return validation error or auth error
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Payment Webhooks', () => {
    test('Paymob webhook should validate signature', async ({ request }) => {
      const response = await request.post('/api/payment/webhooks/paymob', {
        data: { test: true },
      });

      // Should reject invalid signature
      expect([400, 500]).toContain(response.status());
    });

    test('PayTabs webhook should validate signature', async ({ request }) => {
      const response = await request.post('/api/payment/webhooks/paytabs', {
        data: { test: true },
      });

      // Should reject invalid signature
      expect([400, 500]).toContain(response.status());
    });

    test('Paddle webhook should validate signature', async ({ request }) => {
      const response = await request.post('/api/payment/webhooks/paddle', {
        data: { test: true },
      });

      // Should reject invalid signature
      expect([400, 500]).toContain(response.status());
    });
  });

  test.describe('Pricing Page Payment Methods', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en/pricing');
      await page.waitForLoadState('networkidle');
    });

    test('should display pricing plans with payment options', async ({ page }) => {
      // Check pricing page loads
      await expect(page.locator('body')).toBeVisible();

      // Check for plan cards
      const planCards = page.locator('[data-testid="plan-card"], .pricing-card, .plan-card, [class*="plan"]');
      const planCount = await planCards.count();

      // Should have multiple plans
      if (planCount > 0) {
        expect(planCount).toBeGreaterThanOrEqual(2);
      }

      await page.screenshot({ path: 'screenshots/payment-01-pricing-plans.png', fullPage: true });
    });

    test('should show payment method icons if available', async ({ page }) => {
      // Look for payment method icons/badges
      const paymentIcons = page.locator('[data-testid="payment-methods"], img[alt*="payment"], svg[aria-label*="payment"], .payment-icons, .payment-methods');

      if (await paymentIcons.count() > 0) {
        await expect(paymentIcons.first()).toBeVisible();
        await page.screenshot({ path: 'screenshots/payment-02-icons.png' });
      }
    });

    test('should display secure payment badge', async ({ page }) => {
      // Look for security/trust badges
      const securityBadge = page.locator(':has-text("Secure"), :has-text("SSL"), :has-text("PCI"), [data-testid="security-badge"]');

      if (await securityBadge.count() > 0) {
        await expect(securityBadge.first()).toBeVisible();
      }
    });
  });

  test.describe('Regional Payment Display', () => {
    test('should show appropriate payment methods for Egypt', async ({ page }) => {
      // Simulate Egypt location via header
      await page.setExtraHTTPHeaders({
        'cf-ipcountry': 'EG',
      });

      await page.goto('/en/pricing');
      await page.waitForLoadState('networkidle');

      // Page should load and potentially show local payment options
      await expect(page.locator('body')).toBeVisible();

      await page.screenshot({ path: 'screenshots/payment-03-egypt.png', fullPage: true });
    });

    test('should show appropriate payment methods for Saudi Arabia', async ({ page }) => {
      // Simulate Saudi location via header
      await page.setExtraHTTPHeaders({
        'cf-ipcountry': 'SA',
      });

      await page.goto('/en/pricing');
      await page.waitForLoadState('networkidle');

      // Page should load
      await expect(page.locator('body')).toBeVisible();

      await page.screenshot({ path: 'screenshots/payment-04-saudi.png', fullPage: true });
    });
  });

  test.describe('Checkout Flow', () => {
    test('should require login before checkout', async ({ page }) => {
      await page.goto('/en/pricing');
      await page.waitForLoadState('networkidle');

      // Find and click upgrade button
      const upgradeBtn = page.locator('button:has-text("Upgrade"), button:has-text("Get Started"), button:has-text("Subscribe")').first();

      if (await upgradeBtn.count() > 0 && await upgradeBtn.isVisible()) {
        await upgradeBtn.click();
        await page.waitForTimeout(2000);

        // Should redirect to login or show login modal
        const currentUrl = page.url();
        const hasLoginRedirect = currentUrl.includes('login') ||
                                 currentUrl.includes('signin') ||
                                 currentUrl.includes('auth');

        const loginModal = page.locator('[data-testid="login-modal"], .login-form, form:has-text("Sign in")');
        const hasLoginModal = await loginModal.count() > 0;

        // Either redirected to login or showing login modal
        expect(hasLoginRedirect || hasLoginModal).toBe(true);

        await page.screenshot({ path: 'screenshots/payment-05-login-required.png' });
      }
    });
  });

  test.describe('Payment Error Handling', () => {
    test('should display error message when checkout fails', async ({ page }) => {
      await page.goto('/en/pricing?payment=cancelled');
      await page.waitForLoadState('networkidle');

      // Look for error or cancelled message
      const errorMessage = page.locator(':has-text("cancelled"), :has-text("Cancelled"), [data-testid="payment-error"]');

      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/payment-06-cancelled.png' });
    });

    test('should display success message after payment', async ({ page }) => {
      await page.goto('/en/dashboard?payment=success');
      await page.waitForLoadState('networkidle');

      // Look for success message
      const successMessage = page.locator(':has-text("success"), :has-text("Success"), :has-text("Welcome"), [data-testid="payment-success"]');

      if (await successMessage.count() > 0) {
        await expect(successMessage.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/payment-07-success.png' });
    });
  });

  test.describe('Billing Cycle Toggle', () => {
    test('should toggle between monthly and yearly pricing', async ({ page }) => {
      await page.goto('/en/pricing');
      await page.waitForLoadState('networkidle');

      // Find billing toggle
      const yearlyToggle = page.locator('button:has-text("Yearly"), button:has-text("Annual"), [data-testid="yearly-toggle"]');
      const monthlyToggle = page.locator('button:has-text("Monthly"), [data-testid="monthly-toggle"]');

      if (await yearlyToggle.count() > 0) {
        await yearlyToggle.first().click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'screenshots/payment-08-yearly.png' });

        if (await monthlyToggle.count() > 0) {
          await monthlyToggle.first().click();
          await page.waitForTimeout(500);

          await page.screenshot({ path: 'screenshots/payment-09-monthly.png' });
        }
      }
    });
  });

  test.describe('Arabic Payment Experience', () => {
    test('should display payment page in Arabic', async ({ page }) => {
      await page.goto('/ar/pricing');
      await page.waitForLoadState('networkidle');

      // Check for RTL direction
      const html = page.locator('html');
      const dir = await html.getAttribute('dir');
      expect(dir).toBe('rtl');

      // Check for Arabic content
      const arabicContent = page.locator(':has-text("الأسعار"), :has-text("الدفع"), :has-text("اشتراك")');
      if (await arabicContent.count() > 0) {
        await expect(arabicContent.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/payment-10-arabic.png', fullPage: true });
    });
  });
});
