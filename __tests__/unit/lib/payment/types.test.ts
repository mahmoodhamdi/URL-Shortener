import { describe, it, expect } from 'vitest';
import {
  CURRENCIES,
  toSmallestUnit,
  fromSmallestUnit,
  formatCurrency,
  REGION_GATEWAY_MAP,
  getPreferredGateways,
  getPreferredGateway,
} from '@/lib/payment/types';

describe('Payment Types', () => {
  describe('CURRENCIES', () => {
    it('should have USD currency configured', () => {
      expect(CURRENCIES.USD).toBeDefined();
      expect(CURRENCIES.USD.code).toBe('USD');
      expect(CURRENCIES.USD.symbol).toBe('$');
      expect(CURRENCIES.USD.decimals).toBe(2);
      expect(CURRENCIES.USD.smallestUnit).toBe(100);
    });

    it('should have EGP currency configured', () => {
      expect(CURRENCIES.EGP).toBeDefined();
      expect(CURRENCIES.EGP.code).toBe('EGP');
      expect(CURRENCIES.EGP.symbol).toBe('E£');
      expect(CURRENCIES.EGP.decimals).toBe(2);
    });

    it('should have SAR currency configured', () => {
      expect(CURRENCIES.SAR).toBeDefined();
      expect(CURRENCIES.SAR.code).toBe('SAR');
    });

    it('should have AED currency configured', () => {
      expect(CURRENCIES.AED).toBeDefined();
      expect(CURRENCIES.AED.code).toBe('AED');
    });

    it('should have 3-decimal currencies configured', () => {
      // Kuwaiti Dinar uses 3 decimals
      expect(CURRENCIES.KWD).toBeDefined();
      expect(CURRENCIES.KWD.decimals).toBe(3);
      expect(CURRENCIES.KWD.smallestUnit).toBe(1000);

      // Bahraini Dinar uses 3 decimals
      expect(CURRENCIES.BHD).toBeDefined();
      expect(CURRENCIES.BHD.decimals).toBe(3);
      expect(CURRENCIES.BHD.smallestUnit).toBe(1000);

      // Omani Rial uses 3 decimals
      expect(CURRENCIES.OMR).toBeDefined();
      expect(CURRENCIES.OMR.decimals).toBe(3);
      expect(CURRENCIES.OMR.smallestUnit).toBe(1000);
    });
  });

  describe('toSmallestUnit', () => {
    it('should convert USD to cents', () => {
      expect(toSmallestUnit(10, 'USD')).toBe(1000);
      expect(toSmallestUnit(10.50, 'USD')).toBe(1050);
      expect(toSmallestUnit(0.99, 'USD')).toBe(99);
    });

    it('should convert EGP to piasters', () => {
      expect(toSmallestUnit(100, 'EGP')).toBe(10000);
      expect(toSmallestUnit(250.50, 'EGP')).toBe(25050);
    });

    it('should convert 3-decimal currencies correctly', () => {
      expect(toSmallestUnit(10, 'KWD')).toBe(10000);
      expect(toSmallestUnit(5.500, 'KWD')).toBe(5500);
    });

    it('should default to USD for unknown currencies', () => {
      expect(toSmallestUnit(10, 'UNKNOWN')).toBe(1000);
    });

    it('should handle zero amounts', () => {
      expect(toSmallestUnit(0, 'USD')).toBe(0);
      expect(toSmallestUnit(0, 'EGP')).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(toSmallestUnit(10.999, 'USD')).toBe(1100);
      expect(toSmallestUnit(10.001, 'USD')).toBe(1000);
    });
  });

  describe('fromSmallestUnit', () => {
    it('should convert cents to USD', () => {
      expect(fromSmallestUnit(1000, 'USD')).toBe(10);
      expect(fromSmallestUnit(1050, 'USD')).toBe(10.50);
      expect(fromSmallestUnit(99, 'USD')).toBe(0.99);
    });

    it('should convert piasters to EGP', () => {
      expect(fromSmallestUnit(10000, 'EGP')).toBe(100);
      expect(fromSmallestUnit(25050, 'EGP')).toBe(250.50);
    });

    it('should convert 3-decimal currencies correctly', () => {
      expect(fromSmallestUnit(10000, 'KWD')).toBe(10);
      expect(fromSmallestUnit(5500, 'KWD')).toBe(5.5);
    });

    it('should handle zero amounts', () => {
      expect(fromSmallestUnit(0, 'USD')).toBe(0);
      expect(fromSmallestUnit(0, 'EGP')).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format USD amounts', () => {
      const formatted = formatCurrency(10, 'USD');
      expect(formatted).toContain('10');
      expect(formatted).toContain('$');
    });

    it('should format EGP amounts', () => {
      const formatted = formatCurrency(100, 'EGP');
      expect(formatted).toContain('100');
    });

    it('should format with correct decimal places', () => {
      const usd = formatCurrency(10.5, 'USD');
      expect(usd).toMatch(/10\.50/);
    });
  });

  describe('REGION_GATEWAY_MAP', () => {
    it('should have Egypt mapped to Paymob first', () => {
      expect(REGION_GATEWAY_MAP.EG).toBeDefined();
      expect(REGION_GATEWAY_MAP.EG[0]).toBe('paymob');
      expect(REGION_GATEWAY_MAP.EG).toContain('stripe');
    });

    it('should have Saudi Arabia mapped to PayTabs first', () => {
      expect(REGION_GATEWAY_MAP.SA).toBeDefined();
      expect(REGION_GATEWAY_MAP.SA[0]).toBe('paytabs');
      expect(REGION_GATEWAY_MAP.SA).toContain('stripe');
    });

    it('should have UAE mapped to PayTabs first', () => {
      expect(REGION_GATEWAY_MAP.AE).toBeDefined();
      expect(REGION_GATEWAY_MAP.AE[0]).toBe('paytabs');
    });

    it('should have GCC countries mapped to PayTabs', () => {
      const gccCountries = ['KW', 'BH', 'OM', 'QA'];
      for (const country of gccCountries) {
        expect(REGION_GATEWAY_MAP[country]).toBeDefined();
        expect(REGION_GATEWAY_MAP[country][0]).toBe('paytabs');
      }
    });

    it('should have European countries mapped to Paddle first', () => {
      const euCountries = ['GB', 'DE', 'FR', 'IT', 'ES'];
      for (const country of euCountries) {
        expect(REGION_GATEWAY_MAP[country]).toBeDefined();
        expect(REGION_GATEWAY_MAP[country][0]).toBe('paddle');
      }
    });

    it('should have DEFAULT fallback', () => {
      expect(REGION_GATEWAY_MAP.DEFAULT).toBeDefined();
      expect(REGION_GATEWAY_MAP.DEFAULT[0]).toBe('stripe');
    });
  });

  describe('getPreferredGateways', () => {
    it('should return gateways for Egypt', () => {
      const gateways = getPreferredGateways('EG');
      expect(gateways).toEqual(['paymob', 'stripe']);
    });

    it('should return gateways for Saudi Arabia', () => {
      const gateways = getPreferredGateways('SA');
      expect(gateways).toEqual(['paytabs', 'stripe']);
    });

    it('should return gateways for UK', () => {
      const gateways = getPreferredGateways('GB');
      expect(gateways).toEqual(['paddle', 'stripe']);
    });

    it('should handle lowercase country codes', () => {
      const gateways = getPreferredGateways('eg');
      expect(gateways).toEqual(['paymob', 'stripe']);
    });

    it('should return default for unknown countries', () => {
      const gateways = getPreferredGateways('XX');
      expect(gateways).toEqual(['stripe', 'paddle']);
    });

    it('should return default for empty string', () => {
      const gateways = getPreferredGateways('');
      expect(gateways).toEqual(['stripe', 'paddle']);
    });
  });

  describe('getPreferredGateway', () => {
    it('should return paymob for Egypt', () => {
      expect(getPreferredGateway('EG')).toBe('paymob');
    });

    it('should return paytabs for Saudi Arabia', () => {
      expect(getPreferredGateway('SA')).toBe('paytabs');
    });

    it('should return paddle for UK', () => {
      expect(getPreferredGateway('GB')).toBe('paddle');
    });

    it('should return stripe for unknown countries', () => {
      expect(getPreferredGateway('XX')).toBe('stripe');
    });
  });
});
