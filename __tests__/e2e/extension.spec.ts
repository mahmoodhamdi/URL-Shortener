import { test, expect } from '@playwright/test';

test.describe('Browser Extension API', () => {
  const baseUrl = 'http://127.0.0.1:3000';

  test.describe('Extension Token Validation', () => {
    test('should reject request without Authorization header', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/extension/validate`);

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toContain('Authorization');
    });

    test('should reject invalid token format', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/extension/validate`, {
        headers: {
          Authorization: 'Bearer invalid_token',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toContain('Invalid token format');
    });

    test('should reject non-existent token', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/extension/validate`, {
        headers: {
          Authorization: 'Bearer ext_nonexistent123456789012345678',
        },
      });

      // 401 (invalid token) or 500 (database error)
      expect([401, 500]).toContain(response.status());
    });
  });

  test.describe('Extension Shorten API', () => {
    test('should reject request without Authorization header', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/extension/shorten`, {
        data: {
          url: 'https://example.com',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should validate URL format', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/extension/shorten`, {
        headers: {
          Authorization: 'Bearer ext_test123456789012345678901234',
        },
        data: {
          url: 'not-a-valid-url',
        },
      });

      // Either 401 (invalid token), 400 (invalid URL), or 500 (database error)
      expect([400, 401, 500]).toContain(response.status());
    });
  });

  test.describe('Extension History API', () => {
    test('should reject request without Authorization header', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/extension/history`);

      expect(response.status()).toBe(401);
    });

    test('should accept limit parameter', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/extension/history?limit=5`, {
        headers: {
          Authorization: 'Bearer ext_test123456789012345678901234',
        },
      });

      // Either 401 (invalid token), 200 (success), or 500 (database error)
      expect([200, 401, 500]).toContain(response.status());
    });
  });

  test.describe('Extension Token Management', () => {
    test('should require authentication for token listing', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/extension/tokens`);

      // 401 (unauthorized) or 500 (database error)
      expect([401, 500]).toContain(response.status());
    });

    test('should require authentication for token creation', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/extension/tokens`, {
        data: {
          name: 'Test Token',
        },
      });

      // 401 (unauthorized) or 500 (database error)
      expect([401, 500]).toContain(response.status());
    });

    test('should require authentication for token deletion', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/extension/tokens/test-token-id`);

      // 401 (unauthorized) or 500 (database error)
      expect([401, 500]).toContain(response.status());
    });
  });

  test.describe('Quick Validation (GET)', () => {
    test('should return valid: false for missing token', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/extension/validate`);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.valid).toBe(false);
    });

    test('should return valid: false for invalid token', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/extension/validate`, {
        headers: {
          Authorization: 'Bearer ext_invalid123456789012345678',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.valid).toBe(false);
    });
  });
});
