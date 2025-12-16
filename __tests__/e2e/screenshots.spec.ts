import { test, expect, Page } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'screenshots');

// Helper to take screenshots with consistent naming
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

// Helper to set theme
async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, theme);
  await page.waitForTimeout(300); // Wait for theme transition
}

// Helper to wait for page load
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Extra time for animations
}

test.describe('Homepage Screenshots', () => {
  test('English - Light Mode - Desktop', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '01-home-en-light-desktop');
  });

  test('English - Dark Mode - Desktop', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '02-home-en-dark-desktop');
  });

  test('Arabic - Light Mode - Desktop (RTL)', async ({ page }) => {
    await page.goto('/ar');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '03-home-ar-light-desktop');
  });

  test('Arabic - Dark Mode - Desktop (RTL)', async ({ page }) => {
    await page.goto('/ar');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '04-home-ar-dark-desktop');
  });
});

test.describe('Homepage Screenshots - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test('English - Light Mode - Mobile', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '05-home-en-light-mobile');
  });

  test('English - Dark Mode - Mobile', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '06-home-en-dark-mobile');
  });

  test('Arabic - Light Mode - Mobile (RTL)', async ({ page }) => {
    await page.goto('/ar');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '07-home-ar-light-mobile');
  });

  test('Arabic - Dark Mode - Mobile (RTL)', async ({ page }) => {
    await page.goto('/ar');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '08-home-ar-dark-mobile');
  });
});

test.describe('Authentication Pages', () => {
  test('Login Page - English - Light', async ({ page }) => {
    await page.goto('/en/login');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '09-login-en-light');
  });

  test('Login Page - English - Dark', async ({ page }) => {
    await page.goto('/en/login');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '10-login-en-dark');
  });

  test('Login Page - Arabic - Light (RTL)', async ({ page }) => {
    await page.goto('/ar/login');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '11-login-ar-light');
  });

  test('Register Page - English - Light', async ({ page }) => {
    await page.goto('/en/register');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '12-register-en-light');
  });

  test('Register Page - English - Dark', async ({ page }) => {
    await page.goto('/en/register');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '13-register-en-dark');
  });

  test('Register Page - Arabic - Light (RTL)', async ({ page }) => {
    await page.goto('/ar/register');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '14-register-ar-light');
  });
});

test.describe('Pricing Page', () => {
  test('Pricing - English - Light', async ({ page }) => {
    await page.goto('/en/pricing');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '15-pricing-en-light');
  });

  test('Pricing - English - Dark', async ({ page }) => {
    await page.goto('/en/pricing');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '16-pricing-en-dark');
  });

  test('Pricing - Arabic - Light (RTL)', async ({ page }) => {
    await page.goto('/ar/pricing');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '17-pricing-ar-light');
  });

  test('Pricing - Arabic - Dark (RTL)', async ({ page }) => {
    await page.goto('/ar/pricing');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '18-pricing-ar-dark');
  });
});

test.describe('Pricing Page - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('Pricing - English - Light - Mobile', async ({ page }) => {
    await page.goto('/en/pricing');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '19-pricing-en-light-mobile');
  });

  test('Pricing - English - Dark - Mobile', async ({ page }) => {
    await page.goto('/en/pricing');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '20-pricing-en-dark-mobile');
  });
});

test.describe('API Documentation Page', () => {
  test('API Docs - English - Light', async ({ page }) => {
    await page.goto('/en/api-docs');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '21-api-docs-en-light');
  });

  test('API Docs - English - Dark', async ({ page }) => {
    await page.goto('/en/api-docs');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '22-api-docs-en-dark');
  });

  test('API Docs - Arabic - Light (RTL)', async ({ page }) => {
    await page.goto('/ar/api-docs');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '23-api-docs-ar-light');
  });
});

test.describe('Bulk Shortening Page', () => {
  test('Bulk - English - Light', async ({ page }) => {
    await page.goto('/en/bulk');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '24-bulk-en-light');
  });

  test('Bulk - English - Dark', async ({ page }) => {
    await page.goto('/en/bulk');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '25-bulk-en-dark');
  });

  test('Bulk - Arabic - Light (RTL)', async ({ page }) => {
    await page.goto('/ar/bulk');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '26-bulk-ar-light');
  });
});

test.describe('URL Shortening Flow', () => {
  test('Shorten URL - Before Input', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Focus on input
    const urlInput = page.getByPlaceholder(/paste|enter|url/i).first();
    if (await urlInput.isVisible()) {
      await urlInput.focus();
    }
    await takeScreenshot(page, '27-shorten-input-empty');
  });

  test('Shorten URL - With Input', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Fill URL input
    const urlInput = page.getByPlaceholder(/paste|enter|url/i).first();
    if (await urlInput.isVisible()) {
      await urlInput.fill('https://example.com/very-long-url-that-needs-to-be-shortened');
    }
    await takeScreenshot(page, '28-shorten-input-filled');
  });

  test('Shorten URL - Result (Mocked)', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Try to find any result or success element
    const urlInput = page.getByPlaceholder(/paste|enter|url/i).first();
    if (await urlInput.isVisible()) {
      await urlInput.fill('https://example.com');
      // Try to submit
      const submitBtn = page.getByRole('button', { name: /shorten|create|submit/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    await takeScreenshot(page, '29-shorten-result');
  });
});

test.describe('Dashboard Page (Requires Auth)', () => {
  test('Dashboard - Unauthenticated Redirect', async ({ page }) => {
    await page.goto('/en/dashboard');
    await waitForPageLoad(page);
    await takeScreenshot(page, '30-dashboard-unauthenticated');
  });
});

test.describe('Settings Page (Requires Auth)', () => {
  test('Settings - Unauthenticated Redirect', async ({ page }) => {
    await page.goto('/en/settings');
    await waitForPageLoad(page);
    await takeScreenshot(page, '31-settings-unauthenticated');
  });
});

test.describe('Domains Page (Requires Auth)', () => {
  test('Domains - Unauthenticated Redirect', async ({ page }) => {
    await page.goto('/en/domains');
    await waitForPageLoad(page);
    await takeScreenshot(page, '32-domains-unauthenticated');
  });
});

test.describe('Error Pages', () => {
  test('404 Page - English', async ({ page }) => {
    await page.goto('/en/non-existent-page-12345');
    await waitForPageLoad(page);
    await takeScreenshot(page, '33-404-en');
  });

  test('404 Page - Arabic', async ({ page }) => {
    await page.goto('/ar/non-existent-page-12345');
    await waitForPageLoad(page);
    await takeScreenshot(page, '34-404-ar');
  });

  test('Invalid Short Code', async ({ page }) => {
    await page.goto('/en/invalid-short-code-xyz');
    await waitForPageLoad(page);
    await takeScreenshot(page, '35-invalid-shortcode');
  });
});

test.describe('Responsive Breakpoints', () => {
  const breakpoints = [
    { name: 'mobile-sm', width: 320, height: 568 },
    { name: 'mobile-md', width: 375, height: 667 },
    { name: 'mobile-lg', width: 414, height: 896 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'laptop', width: 1024, height: 768 },
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'desktop-xl', width: 1920, height: 1080 },
  ];

  for (const bp of breakpoints) {
    test(`Homepage - ${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/en');
      await waitForPageLoad(page);
      await setTheme(page, 'light');
      await takeScreenshot(page, `36-responsive-${bp.name}`);
    });
  }
});

test.describe('Component States', () => {
  test('Theme Toggle - Before Click', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Find theme toggle
    const themeToggle = page.getByRole('button', { name: /theme|dark|light|mode/i }).first();
    if (await themeToggle.isVisible()) {
      await themeToggle.scrollIntoViewIfNeeded();
    }
    await takeScreenshot(page, '43-theme-toggle-light');
  });

  test('Theme Toggle - After Click (Dark)', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'dark');
    await takeScreenshot(page, '44-theme-toggle-dark');
  });

  test('Language Switcher - English', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Try to find language switcher
    const langSwitcher = page.getByRole('button', { name: /language|en|ar|english|arabic/i }).first();
    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();
      await page.waitForTimeout(300);
    }
    await takeScreenshot(page, '45-language-switcher-en');
  });

  test('Language Switcher - Arabic', async ({ page }) => {
    await page.goto('/ar');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '46-language-switcher-ar');
  });
});

test.describe('Form Validation States', () => {
  test('Login - Empty Form Error', async ({ page }) => {
    await page.goto('/en/login');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Try to submit empty form
    const submitBtn = page.getByRole('button', { name: /sign in|login|submit/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
    }
    await takeScreenshot(page, '47-login-validation-error');
  });

  test('Register - Empty Form Error', async ({ page }) => {
    await page.goto('/en/register');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Try to submit empty form
    const submitBtn = page.getByRole('button', { name: /sign up|register|create|submit/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
    }
    await takeScreenshot(page, '48-register-validation-error');
  });

  test('URL Input - Invalid URL Error', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    const urlInput = page.getByPlaceholder(/paste|enter|url/i).first();
    if (await urlInput.isVisible()) {
      await urlInput.fill('not-a-valid-url');
      const submitBtn = page.getByRole('button', { name: /shorten|create|submit/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
    }
    await takeScreenshot(page, '49-url-validation-error');
  });
});

test.describe('Navigation States', () => {
  test('Mobile Menu - Closed', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');
    await takeScreenshot(page, '50-mobile-menu-closed');
  });

  test('Mobile Menu - Open', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Try to open mobile menu
    const menuBtn = page.getByRole('button', { name: /menu|hamburger/i }).first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(300);
    }
    await takeScreenshot(page, '51-mobile-menu-open');
  });
});

test.describe('Loading States', () => {
  test('Page Loading Skeleton', async ({ page }) => {
    // Slow down network to capture loading state
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto('/en');
    // Take screenshot quickly before full load
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '52-loading-state.png'),
    });
  });
});

test.describe('Footer and Header', () => {
  test('Header - Desktop', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Scroll to top for header
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '53-header-desktop.png'),
      clip: { x: 0, y: 0, width: 1280, height: 100 },
    });
  });

  test('Footer - Desktop', async ({ page }) => {
    await page.goto('/en');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Scroll to bottom for footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await takeScreenshot(page, '54-footer-desktop');
  });
});

test.describe('Social/OAuth Buttons', () => {
  test('Login with OAuth Buttons', async ({ page }) => {
    await page.goto('/en/login');
    await waitForPageLoad(page);
    await setTheme(page, 'light');

    // Screenshot just the OAuth section
    await takeScreenshot(page, '55-oauth-buttons');
  });
});
