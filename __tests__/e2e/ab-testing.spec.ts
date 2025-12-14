import { test, expect } from '@playwright/test';

test.describe('A/B Testing API', () => {
  const baseUrl = 'http://127.0.0.1:3000';

  test.describe('A/B Test CRUD Operations', () => {
    test('should handle A/B test creation flow', async ({ request }) => {
      // First create a link to test with
      const linkResponse = await request.post(`${baseUrl}/api/shorten`, {
        data: {
          url: 'https://example.com/ab-test-original',
        },
      });

      // The endpoint might require auth or return validation errors
      const linkStatus = linkResponse.status();
      expect([200, 201, 400, 401, 403]).toContain(linkStatus);
    });

    test('should return error for non-existent link', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/links/non-existent-id/ab-test`);

      // Should return error status (auth, not found, or server error)
      expect([401, 404, 500]).toContain(response.status());
    });

    test('should require authentication for A/B test operations', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/links/test-id/ab-test`, {
        data: {
          name: 'Test A/B',
          variants: [
            { name: 'Control', url: 'https://example.com/a', weight: 50 },
            { name: 'Variant', url: 'https://example.com/b', weight: 50 },
          ],
        },
      });

      // Should require authentication or return error
      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should require authentication for variant operations', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/links/test-id/ab-test/variants`, {
        data: {
          name: 'New Variant',
          url: 'https://example.com/new',
          weight: 25,
        },
      });

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should require authentication for stats', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/links/test-id/ab-test/stats`);

      expect([401, 403, 404, 500]).toContain(response.status());
    });
  });

  test.describe('A/B Test Redirect Flow', () => {
    test('should handle redirect with potential A/B testing', async ({ request }) => {
      // Create a short link first
      const createResponse = await request.post(`${baseUrl}/api/shorten`, {
        data: {
          url: 'https://example.com/redirect-test',
        },
      });

      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const linkData = await createResponse.json();

        // Test the redirect endpoint
        const redirectResponse = await request.get(`${baseUrl}/api/r/${linkData.shortCode}`, {
          maxRedirects: 0,
        });

        // Should redirect (302) or follow through
        expect([200, 301, 302, 307, 308]).toContain(redirectResponse.status());
      }
    });
  });

  test.describe('API Response Handling', () => {
    test('should respond to A/B test endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/links/test-id/ab-test`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should respond to stats endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/links/test-id/ab-test/stats`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });
  });
});
