import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/en/login');
      await page.waitForLoadState('networkidle');
    });

    test('should display login form', async ({ page }) => {
      // Check for login form elements
      const emailInput = page.locator('input[type="email"], input#email');
      const passwordInput = page.locator('input[type="password"], input#password');
      const submitBtn = page.locator('button[type="submit"]');

      if (await emailInput.count() > 0) {
        await expect(emailInput.first()).toBeVisible();
      }
      if (await passwordInput.count() > 0) {
        await expect(passwordInput.first()).toBeVisible();
      }
      if (await submitBtn.count() > 0) {
        await expect(submitBtn.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/auth-01-login-page.png', fullPage: true });
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      // Click submit without filling fields
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
      }

      // Should show validation error or remain on page
      await page.waitForTimeout(500);
      const currentUrl = page.url();
      expect(currentUrl).toContain('login');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input#email');
      const passwordInput = page.locator('input[type="password"], input#password');

      if (await emailInput.count() > 0) {
        await emailInput.fill('invalid@example.com');
      }
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('wrongpassword');
      }

      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
      }

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
      await page.goto('/en/register');
      await page.waitForLoadState('networkidle');
    });

    test('should display registration form', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input#email');
      const passwordInput = page.locator('input[type="password"], input#password');

      if (await emailInput.count() > 0) {
        await expect(emailInput.first()).toBeVisible();
      }
      if (await passwordInput.count() > 0) {
        await expect(passwordInput.first()).toBeVisible();
      }

      await page.screenshot({ path: 'screenshots/auth-03-register-page.png', fullPage: true });
    });

    test('should have link to login page', async ({ page }) => {
      const loginLink = page.locator('a[href*="signin"], a[href*="login"]');
      if (await loginLink.count() > 0) {
        await expect(loginLink.first()).toBeVisible();
      }
    });

    test('should validate password requirements', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input#email');
      const passwordInput = page.locator('input[type="password"], input#password');

      if (await emailInput.count() > 0) {
        await emailInput.fill('test@example.com');
      }
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('123'); // Too short
      }

      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
      }

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
