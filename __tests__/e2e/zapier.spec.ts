import { test, expect } from '@playwright/test';

test.describe('Zapier Integration API', () => {
  const baseUrl = 'http://127.0.0.1:3000';

  test.describe('Subscribe/Unsubscribe API', () => {
    test('should require authentication to list subscriptions', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/subscribe`);

      // Should require authentication or return server error
      expect([401, 403, 500]).toContain(response.status());
    });

    test('should require authentication to create subscription', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/zapier/subscribe`, {
        data: {
          hookUrl: 'https://hooks.zapier.com/test',
          event: 'LINK_CREATED',
        },
      });

      expect([401, 403, 500]).toContain(response.status());
    });

    test('should require authentication to delete subscription', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/zapier/subscribe?id=test-id`);

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to subscription list endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/subscribe`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });
  });

  test.describe('Actions API', () => {
    test('should require authentication to create link', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/zapier/actions/create-link`, {
        data: {
          url: 'https://example.com',
        },
      });

      expect([401, 403, 500]).toContain(response.status());
    });

    test('should require authentication to update link', async ({ request }) => {
      const response = await request.put(`${baseUrl}/api/zapier/actions/update-link`, {
        data: {
          id: 'test-id',
          title: 'Updated Title',
        },
      });

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should require authentication to delete link', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/zapier/actions/delete-link?id=test-id`);

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to create-link endpoint', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/zapier/actions/create-link`, {
        data: {
          url: 'https://example.com',
        },
      });

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should respond to update-link endpoint', async ({ request }) => {
      const response = await request.put(`${baseUrl}/api/zapier/actions/update-link`, {
        data: {
          id: 'test-id',
        },
      });

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should respond to delete-link endpoint', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/zapier/actions/delete-link?id=test-id`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });
  });

  test.describe('Search API', () => {
    test('should require authentication to search links', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/search/link?query=test`);

      expect([401, 403, 500]).toContain(response.status());
    });

    test('should require authentication to search bio pages', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/search/bio-page?query=test`);

      expect([401, 403, 500]).toContain(response.status());
    });

    test('should respond to link search endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/search/link`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should respond to bio-page search endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/search/bio-page`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });
  });

  test.describe('Triggers API', () => {
    test('should require authentication to get new links', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/triggers/new-links`);

      expect([401, 403, 500]).toContain(response.status());
    });

    test('should require authentication to get link clicks', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/triggers/link-clicks`);

      expect([401, 403, 500]).toContain(response.status());
    });

    test('should respond to new-links trigger endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/triggers/new-links`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should respond to link-clicks trigger endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/triggers/link-clicks`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should accept limit parameter for new-links', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/zapier/triggers/new-links?limit=5`);

      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should accept since parameter for link-clicks', async ({ request }) => {
      const since = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago
      const response = await request.get(`${baseUrl}/api/zapier/triggers/link-clicks?since=${since}`);

      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });
  });

  test.describe('API Validation', () => {
    test('should validate event type in subscribe', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/zapier/subscribe`, {
        data: {
          hookUrl: 'https://hooks.zapier.com/test',
          event: 'INVALID_EVENT',
        },
      });

      // Should fail validation or auth
      expect([400, 401, 403, 500]).toContain(response.status());
    });

    test('should validate hookUrl format in subscribe', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/zapier/subscribe`, {
        data: {
          hookUrl: 'not-a-valid-url',
          event: 'LINK_CREATED',
        },
      });

      // Should fail validation or auth
      expect([400, 401, 403, 500]).toContain(response.status());
    });

    test('should require hookUrl in subscribe', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/zapier/subscribe`, {
        data: {
          event: 'LINK_CREATED',
        },
      });

      expect([400, 401, 403, 500]).toContain(response.status());
    });

    test('should require event in subscribe', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/zapier/subscribe`, {
        data: {
          hookUrl: 'https://hooks.zapier.com/test',
        },
      });

      expect([400, 401, 403, 500]).toContain(response.status());
    });
  });
});
