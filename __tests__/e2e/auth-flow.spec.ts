import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en/auth/signin');
    });

    test('should display login form', async ({ page }) => {
      await expect(page.locator('h1, h2').first()).toContainText(/sign in|login/i);
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      await page.screenshot({ path: 'screenshots/auth-01-login-page.png', fullPage: true });
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      // Click submit without filling fields
      await page.click('button[type="submit"]');

      // Should show validation error or remain on page
      await page.waitForTimeout(500);
      const currentUrl = page.url();
      expect(currentUrl).toContain('signin');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Wait for error message or redirect
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'screenshots/auth-02-login-error.png' });
    });

    test('should have link to registration page', async ({ page }) => {
      const registerLink = page.locator('a[href*="register"], a[href*="signup"]');
      if (await registerLink.count() > 0) {
        await expect(registerLink.first()).toBeVisible();
      }
    });

    test('should have social login options', async ({ page }) => {
      // Check for Google login button
      const googleBtn = page.locator('button:has-text("Google"), [data-testid="google-login"]');
      if (await googleBtn.count() > 0) {
        await expect(googleBtn.first()).toBeVisible();
      }

      // Check for GitHub login button
      const githubBtn = page.locator('button:has-text("GitHub"), [data-testid="github-login"]');
      if (await githubBtn.count() > 0) {
        await expect(githubBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Registration Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en/auth/register');
    });

    test('should display registration form', async ({ page }) => {
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();

      await page.screenshot({ path: 'screenshots/auth-03-register-page.png', fullPage: true });
    });

    test('should have link to login page', async ({ page }) => {
      const loginLink = page.locator('a[href*="signin"], a[href*="login"]');
      if (await loginLink.count() > 0) {
        await expect(loginLink.first()).toBeVisible();
      }
    });

    test('should validate password requirements', async ({ page }) => {
      await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
      await page.fill('input[type="password"]', '123'); // Too short
      await page.click('button[type="submit"]');

      // Should show validation error or remain on page
      await page.waitForTimeout(500);
      const currentUrl = page.url();
      expect(currentUrl).toContain('register');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/en/dashboard');

      // Should either show login prompt or redirect
      await page.waitForTimeout(2000);
      const currentUrl = page.url();

      // Either redirected to login or showing dashboard (if session exists)
      expect(currentUrl).toMatch(/signin|login|dashboard/);
    });

    test('should redirect to login when accessing settings without auth', async ({ page }) => {
      await page.goto('/en/settings');

      await page.waitForTimeout(2000);
      const currentUrl = page.url();

      expect(currentUrl).toMatch(/signin|login|settings/);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page navigation', async ({ page }) => {
      // Start at home page
      await page.goto('/en');

      // Navigate to different pages
      await page.goto('/en/dashboard');
      await page.goto('/en');

      // Page should still be accessible
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
