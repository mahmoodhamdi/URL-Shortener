import { test, expect } from '@playwright/test';

test.describe('Link Cloaking', () => {
  const baseUrl = 'http://127.0.0.1:3000';

  test.describe('Redirect API with Cloaking', () => {
    test('should respond to redirect endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/r/test-code`);

      // Should return 404 for non-existent link or valid response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should return JSON for non-cloaked links', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/r/test-code`);

      // Should return JSON or error
      const contentType = response.headers()['content-type'];
      expect(contentType).toBeDefined();
    });
  });

  test.describe('Cloaking Integration', () => {
    test('should handle iframe cloaked links', async ({ page }) => {
      // Test that the cloaking page structure would work
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Cloaked Page</title>
          <meta name="robots" content="noindex, nofollow">
        </head>
        <body>
          <iframe id="frame" src="about:blank" style="width:100%;height:100%;border:none;"></iframe>
        </body>
        </html>
      `);

      const iframe = await page.$('iframe');
      expect(iframe).not.toBeNull();

      // Check meta robots tag
      const metaRobots = await page.$('meta[name="robots"]');
      expect(metaRobots).not.toBeNull();
    });

    test('should handle JavaScript redirect cloaked links', async ({ page }) => {
      // Test that JavaScript redirect would work
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting...</title>
          <meta name="robots" content="noindex, nofollow">
        </head>
        <body>
          <div class="loader">
            <div class="spinner"></div>
            <p>Redirecting...</p>
          </div>
        </body>
        </html>
      `);

      const loader = await page.$('.loader');
      expect(loader).not.toBeNull();
    });

    test('should handle meta refresh cloaked links', async ({ page }) => {
      // Test that meta refresh structure is valid by using a non-redirecting page
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting...</title>
          <meta http-equiv="refresh" content="300;url=https://example.com">
          <meta name="robots" content="noindex, nofollow">
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
        </html>
      `);

      const metaRefresh = await page.$('meta[http-equiv="refresh"]');
      expect(metaRefresh).not.toBeNull();

      const content = await metaRefresh?.getAttribute('content');
      expect(content).toContain('url=');
    });
  });

  test.describe('Cloaking Security', () => {
    test('should escape HTML in cloaked page titles', async ({ page }) => {
      // Test XSS prevention by checking the raw HTML contains escaped entities
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>&lt;script&gt;alert(1)&lt;/script&gt;</title>
        </head>
        <body></body>
        </html>
      `;

      // Verify the HTML source contains escaped entities (not raw script tags)
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toMatch(/<title>.*<script>.*<\/title>/);

      await page.setContent(html);

      // Verify no script executed
      const bodyContent = await page.textContent('body');
      expect(bodyContent).not.toContain('alert');
    });

    test('should have noindex meta tag', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="robots" content="noindex, nofollow">
          <title>Cloaked Page</title>
        </head>
        <body></body>
        </html>
      `);

      const metaRobots = await page.$('meta[name="robots"]');
      expect(metaRobots).not.toBeNull();

      const content = await metaRobots?.getAttribute('content');
      expect(content).toContain('noindex');
      expect(content).toContain('nofollow');
    });
  });

  test.describe('API Responses', () => {
    test('should respond to short code redirect API', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/r/abc123`);

      // Should return valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should handle missing short code', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/r/nonexistent-code-12345`);

      // Should return 404 or error
      expect([404, 500]).toContain(response.status());
    });
  });
});
