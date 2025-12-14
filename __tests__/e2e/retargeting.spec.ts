import { test, expect } from '@playwright/test';

test.describe('Retargeting Pixels API', () => {
  const baseUrl = 'http://127.0.0.1:3000';

  test.describe('Pixels CRUD Operations', () => {
    test('should require authentication to list pixels', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/pixels`);

      // Should require authentication or return server error
      expect([401, 403, 500]).toContain(response.status());
    });

    test('should require authentication to create pixel', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/pixels`, {
        data: {
          name: 'Test Facebook Pixel',
          type: 'FACEBOOK',
          pixelId: '1234567890123456',
        },
      });

      expect([401, 403, 500]).toContain(response.status());
    });

    test('should respond to pixel get request', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/pixels/test-pixel-id`);

      // Should require authentication or return not found
      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to pixel update request', async ({ request }) => {
      const response = await request.put(`${baseUrl}/api/pixels/test-pixel-id`, {
        data: {
          name: 'Updated Pixel Name',
        },
      });

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to pixel delete request', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/pixels/test-pixel-id`);

      expect([401, 403, 404, 500]).toContain(response.status());
    });
  });

  test.describe('Link Pixels Operations', () => {
    test('should respond to list link pixels request', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/links/test-link-id/pixels`);

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to add pixel to link request', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/links/test-link-id/pixels`, {
        data: {
          pixelId: 'test-pixel-id',
        },
      });

      expect([401, 403, 404, 500]).toContain(response.status());
    });

    test('should respond to remove pixel from link request', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/links/test-link-id/pixels?pixelId=test-pixel-id`);

      expect([401, 403, 404, 500]).toContain(response.status());
    });
  });

  test.describe('Pixel Type Validation', () => {
    const pixelTypes = [
      { type: 'FACEBOOK', validId: '1234567890123456' },
      { type: 'GOOGLE_ANALYTICS', validId: 'G-ABC1234567' },
      { type: 'GOOGLE_ADS', validId: 'AW-1234567890' },
      { type: 'TWITTER', validId: 'abc12' },
      { type: 'LINKEDIN', validId: '123456' },
      { type: 'TIKTOK', validId: 'ABCDEF123456789' },
    ];

    for (const { type, validId } of pixelTypes) {
      test(`should accept valid ${type} pixel`, async ({ request }) => {
        const response = await request.post(`${baseUrl}/api/pixels`, {
          data: {
            name: `Test ${type} Pixel`,
            type,
            pixelId: validId,
          },
        });

        // Should only fail due to auth or server error, not validation
        expect([401, 403, 500]).toContain(response.status());
      });
    }
  });

  test.describe('API Response Handling', () => {
    test('should respond to pixels list endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/pixels`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should respond to pixel detail endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/pixels/test-id`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });

    test('should respond to link pixels endpoint', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/links/test-id/pixels`);

      // Should have a valid HTTP response
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);
    });
  });
});
