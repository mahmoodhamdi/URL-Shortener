import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPaymentGateway,
  getGatewayForRegion,
  isProviderConfigured,
  getAvailablePaymentMethods,
  resetGateways,
} from '@/lib/payment/gateway-factory';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  resetGateways();
  process.env = {
    ...originalEnv,
    STRIPE_SECRET_KEY: 'sk_test_xxx',
    STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_xxx',
  };
});

afterEach(() => {
  process.env = originalEnv;
  resetGateways();
});

describe('Gateway Factory', () => {
  describe('getPaymentGateway', () => {
    it('should return Stripe gateway', async () => {
      const gateway = await getPaymentGateway('stripe');
      expect(gateway).toBeDefined();
      expect(gateway.provider).toBe('stripe');
    });

    it('should return Paymob gateway', async () => {
      const gateway = await getPaymentGateway('paymob');
      expect(gateway).toBeDefined();
      expect(gateway.provider).toBe('paymob');
    });

    it('should return PayTabs gateway', async () => {
      const gateway = await getPaymentGateway('paytabs');
      expect(gateway).toBeDefined();
      expect(gateway.provider).toBe('paytabs');
    });

    it('should return Paddle gateway', async () => {
      const gateway = await getPaymentGateway('paddle');
      expect(gateway).toBeDefined();
      expect(gateway.provider).toBe('paddle');
    });

    it('should handle case-insensitive provider names', async () => {
      const gateway1 = await getPaymentGateway('STRIPE');
      const gateway2 = await getPaymentGateway('Stripe');
      const gateway3 = await getPaymentGateway('stripe');

      expect(gateway1.provider).toBe('stripe');
      expect(gateway2.provider).toBe('stripe');
      expect(gateway3.provider).toBe('stripe');
    });

    it('should throw error for unknown provider', async () => {
      await expect(getPaymentGateway('unknown')).rejects.toThrow('Unknown payment provider: unknown');
    });

    it('should return same instance on subsequent calls (singleton)', async () => {
      const gateway1 = await getPaymentGateway('stripe');
      const gateway2 = await getPaymentGateway('stripe');
      expect(gateway1).toBe(gateway2);
    });
  });

  describe('getGatewayForRegion', () => {
    it('should return Stripe for US (default)', async () => {
      const gateway = await getGatewayForRegion('US');
      expect(gateway.provider).toBe('stripe');
    });

    it('should return Stripe when preferred gateway is not configured', async () => {
      // Paymob is not configured
      const gateway = await getGatewayForRegion('EG');
      // Should fall back to Stripe since Paymob is not configured
      expect(gateway.provider).toBe('stripe');
    });
  });

  describe('isProviderConfigured', () => {
    it('should return true for configured Stripe', async () => {
      const configured = await isProviderConfigured('stripe');
      expect(configured).toBe(true);
    });

    it('should return false for unconfigured Paymob', async () => {
      const configured = await isProviderConfigured('paymob');
      expect(configured).toBe(false);
    });

    it('should return false for unconfigured PayTabs', async () => {
      const configured = await isProviderConfigured('paytabs');
      expect(configured).toBe(false);
    });

    it('should return false for unconfigured Paddle', async () => {
      const configured = await isProviderConfigured('paddle');
      expect(configured).toBe(false);
    });

    it('should return false for unknown provider', async () => {
      const configured = await isProviderConfigured('unknown');
      expect(configured).toBe(false);
    });
  });

  describe('getAvailablePaymentMethods', () => {
    it('should return Egyptian payment methods', () => {
      const methods = getAvailablePaymentMethods('EG');
      expect(methods).toContain('card');
      expect(methods).toContain('wallet');
      expect(methods).toContain('kiosk');
    });

    it('should return Saudi payment methods including Mada', () => {
      const methods = getAvailablePaymentMethods('SA');
      expect(methods).toContain('card');
      expect(methods).toContain('mada');
      expect(methods).toContain('apple_pay');
      expect(methods).toContain('google_pay');
    });

    it('should return GCC payment methods', () => {
      const gccCountries = ['AE', 'KW', 'BH', 'OM', 'QA'];
      for (const country of gccCountries) {
        const methods = getAvailablePaymentMethods(country);
        expect(methods).toContain('card');
        expect(methods).toContain('apple_pay');
        expect(methods).toContain('google_pay');
      }
    });

    it('should return global payment methods for other countries', () => {
      const methods = getAvailablePaymentMethods('US');
      expect(methods).toContain('card');
      expect(methods).toContain('apple_pay');
      expect(methods).toContain('google_pay');
    });
  });

  describe('resetGateways', () => {
    it('should reset all gateway instances', async () => {
      // Get gateways
      const gateway1 = await getPaymentGateway('stripe');

      // Reset
      resetGateways();

      // Get new instance
      const gateway2 = await getPaymentGateway('stripe');

      // Should be different instances after reset
      expect(gateway1).not.toBe(gateway2);
    });
  });
});
