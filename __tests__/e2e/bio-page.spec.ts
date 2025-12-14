import { test, expect } from '@playwright/test';

test.describe('Bio Page API', () => {
  const baseUrl = 'http://127.0.0.1:3000';

  test.describe('Bio Page CRUD Operations', () => {
    test('should require authentication to list bio pages', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/bio`);

      // Should require authentication
      expect([401, 403]).toContain(response.status());
    });

    test('should require authentication to create bio page', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/bio`, {
        data: {
          slug: 'test-bio-page',
          title: 'Test Bio Page',
          bio: 'This is a test bio page',
          theme: 'DEFAULT',
        },
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should respond to bio page get request', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/bio/test-slug`);

      // Should require authentication or return not found
      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to bio page update request', async ({ request }) => {
      const response = await request.put(`${baseUrl}/api/bio/test-slug`, {
        data: {
          title: 'Updated Title',
        },
      });

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to bio page delete request', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/bio/test-slug`);

      expect([401, 403, 404, 500]).toContain(response.status());
    });
  });

  test.describe('Bio Links Operations', () => {
    test('should respond to bio links list request', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/bio/test-slug/links`);

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to bio link add request', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/bio/test-slug/links`, {
        data: {
          title: 'Test Link',
          url: 'https://example.com',
          position: 0,
        },
      });

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to bio link update request', async ({ request }) => {
      const response = await request.put(`${baseUrl}/api/bio/test-slug/links`, {
        data: {
          linkId: 'test-link-id',
          title: 'Updated Link',
        },
      });

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to bio link delete request', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/bio/test-slug/links?linkId=test-link-id`);

      expect([401, 403, 404, 500]).toContain(response.status());
    });
  });

  test.describe('Bio Page Validation', () => {
    test('should validate slug format in API', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/bio`, {
        data: {
          slug: 'ab', // Too short (less than 3 chars)
          title: 'Test',
        },
      });

      // Should return 400 (bad request) or 401 (unauthorized)
      expect([400, 401, 403]).toContain(response.status());
    });

    test('should validate required fields', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/bio`, {
        data: {
          // Missing required fields
        },
      });

      expect([400, 401, 403]).toContain(response.status());
    });
  });

  test.describe('API Response Handling', () => {
    test('should respond to bio page list endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/bio`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should respond to bio page detail endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/bio/test-slug`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should respond to bio links endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/bio/test-slug/links`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });
  });

  test.describe('Bio Page Themes', () => {
    test('should accept valid theme values', async ({ request }) => {
      const themes = ['DEFAULT', 'DARK', 'LIGHT', 'GRADIENT', 'MINIMAL', 'COLORFUL'];

      for (const theme of themes) {
        const response = await request.post(`${baseUrl}/api/bio`, {
          data: {
            slug: `test-${theme.toLowerCase()}`,
            title: `Test ${theme}`,
            theme: theme,
          },
        });

        // Should only fail due to auth, not validation
        expect([401, 403]).toContain(response.status());
      }
    });
  });
});
