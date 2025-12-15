import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = process.env;

describe('Stripe Client', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getStripe', () => {
    it('should throw error when STRIPE_SECRET_KEY is not set', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      // Import fresh module to test without cached instance
      const { getStripe } = await import('@/lib/stripe/client');

      expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is not configured');
    });

    it('should return Stripe instance when key is configured', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_12345';

      const { getStripe } = await import('@/lib/stripe/client');
      const stripe = getStripe();

      expect(stripe).toBeDefined();
      expect(typeof stripe.customers).toBe('object');
    });

    it('should return same instance on multiple calls (singleton)', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_12345';

      const { getStripe } = await import('@/lib/stripe/client');
      const instance1 = getStripe();
      const instance2 = getStripe();

      expect(instance1).toBe(instance2);
    });
  });

  describe('stripe proxy', () => {
    it('should be defined', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_12345';

      const { stripe } = await import('@/lib/stripe/client');

      expect(stripe).toBeDefined();
    });

    it('should provide access to Stripe methods through proxy', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_12345';

      const { stripe } = await import('@/lib/stripe/client');

      expect(stripe.customers).toBeDefined();
      expect(stripe.subscriptions).toBeDefined();
      expect(stripe.checkout).toBeDefined();
    });
  });
});
