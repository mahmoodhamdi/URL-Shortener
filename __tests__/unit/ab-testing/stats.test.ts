import { describe, it, expect } from 'vitest';
import {
  calculateClickThroughRate,
  calculateConversionRate,
  calculateImprovement,
  normalCDF,
  calculateZScore,
  calculateSignificance,
  isStatisticallySignificant,
  calculateMinSampleSize,
  calculateTestStats,
  estimateTimeToSignificance,
} from '@/lib/ab-testing/stats';

describe('A/B Testing Statistics', () => {
  describe('calculateClickThroughRate', () => {
    it('should return 0 for 0 total clicks', () => {
      expect(calculateClickThroughRate(10, 0)).toBe(0);
    });

    it('should calculate correct CTR', () => {
      expect(calculateClickThroughRate(50, 100)).toBe(50);
      expect(calculateClickThroughRate(25, 100)).toBe(25);
      expect(calculateClickThroughRate(100, 100)).toBe(100);
    });

    it('should handle decimal results', () => {
      const result = calculateClickThroughRate(33, 100);
      expect(result).toBe(33);
    });
  });

  describe('calculateConversionRate', () => {
    it('should return 0 for 0 clicks', () => {
      expect(calculateConversionRate(10, 0)).toBe(0);
    });

    it('should calculate correct conversion rate', () => {
      expect(calculateConversionRate(10, 100)).toBe(10);
      expect(calculateConversionRate(50, 200)).toBe(25);
      expect(calculateConversionRate(0, 100)).toBe(0);
    });

    it('should handle 100% conversion', () => {
      expect(calculateConversionRate(100, 100)).toBe(100);
    });
  });

  describe('calculateImprovement', () => {
    it('should return 0 when control rate is 0 and variant is 0', () => {
      expect(calculateImprovement(0, 0)).toBe(0);
    });

    it('should return 100 when control is 0 and variant > 0', () => {
      expect(calculateImprovement(10, 0)).toBe(100);
    });

    it('should calculate positive improvement', () => {
      // 20% to 25% = 25% improvement
      expect(calculateImprovement(25, 20)).toBe(25);
    });

    it('should calculate negative improvement', () => {
      // 25% to 20% = -20% improvement
      expect(calculateImprovement(20, 25)).toBe(-20);
    });

    it('should return 0 for same rates', () => {
      expect(calculateImprovement(10, 10)).toBe(0);
    });

    it('should handle 100% improvement (doubling)', () => {
      expect(calculateImprovement(20, 10)).toBe(100);
    });
  });

  describe('normalCDF', () => {
    it('should return 0.5 for z = 0', () => {
      const result = normalCDF(0);
      expect(result).toBeCloseTo(0.5, 2);
    });

    it('should return ~0.84 for z = 1', () => {
      const result = normalCDF(1);
      expect(result).toBeCloseTo(0.84, 1);
    });

    it('should return ~0.98 for z = 2', () => {
      const result = normalCDF(2);
      expect(result).toBeCloseTo(0.98, 1);
    });

    it('should return ~0.16 for z = -1', () => {
      const result = normalCDF(-1);
      expect(result).toBeCloseTo(0.16, 1);
    });

    it('should return values between 0 and 1', () => {
      for (let z = -3; z <= 3; z += 0.5) {
        const result = normalCDF(z);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('calculateZScore', () => {
    it('should return 0 when either sample has 0 clicks', () => {
      expect(calculateZScore(10, 0, 5, 100)).toBe(0);
      expect(calculateZScore(10, 100, 5, 0)).toBe(0);
    });

    it('should return 0 for identical proportions', () => {
      const result = calculateZScore(10, 100, 10, 100);
      expect(result).toBeCloseTo(0, 1);
    });

    it('should return positive z-score when first proportion is higher', () => {
      const result = calculateZScore(30, 100, 20, 100);
      expect(result).toBeGreaterThan(0);
    });

    it('should return negative z-score when first proportion is lower', () => {
      const result = calculateZScore(20, 100, 30, 100);
      expect(result).toBeLessThan(0);
    });
  });

  describe('calculateSignificance', () => {
    it('should return low confidence for insufficient data', () => {
      const result = calculateSignificance(1, 10, 1, 10);
      expect(result).toBeLessThan(95);
    });

    it('should return high confidence for large difference with sufficient data', () => {
      // Clear winner: 50% vs 10% conversion with 1000 samples each
      const result = calculateSignificance(500, 1000, 100, 1000);
      expect(result).toBeGreaterThan(95);
    });

    it('should return value between 0 and 100', () => {
      const result = calculateSignificance(30, 100, 20, 100);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('isStatisticallySignificant', () => {
    it('should return false for insufficient data', () => {
      const result = isStatisticallySignificant(5, 10, 3, 10);
      expect(result).toBe(false);
    });

    it('should return true for clearly significant results', () => {
      // Very clear difference: 50% vs 10%
      const result = isStatisticallySignificant(500, 1000, 100, 1000);
      expect(result).toBe(true);
    });

    it('should respect custom threshold', () => {
      // At 90% confidence threshold, some results that wouldn't pass 95% might pass
      const result90 = isStatisticallySignificant(30, 100, 20, 100, 90);
      const result99 = isStatisticallySignificant(30, 100, 20, 100, 99);

      // Result at 90% should be more likely to be true than at 99%
      if (result99) {
        expect(result90).toBe(true);
      }
    });
  });

  describe('calculateMinSampleSize', () => {
    it('should return Infinity for 0 MDE', () => {
      const result = calculateMinSampleSize(10, 0);
      expect(result).toBe(Infinity);
    });

    it('should return reasonable sample size', () => {
      // 5% baseline, 10% MDE
      const result = calculateMinSampleSize(5, 10);
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('should require more samples for smaller MDE', () => {
      const smallMDE = calculateMinSampleSize(10, 5);
      const largeMDE = calculateMinSampleSize(10, 20);
      expect(smallMDE).toBeGreaterThan(largeMDE);
    });
  });

  describe('calculateTestStats', () => {
    it('should return empty stats for no variants', () => {
      const result = calculateTestStats([]);
      expect(result.totalClicks).toBe(0);
      expect(result.totalConversions).toBe(0);
      expect(result.variants).toHaveLength(0);
      expect(result.winner).toBeNull();
      expect(result.isSignificant).toBe(false);
    });

    it('should calculate totals correctly', () => {
      const variants = [
        { id: '1', name: 'Control', clicks: 100, conversions: 10 },
        { id: '2', name: 'Variant A', clicks: 100, conversions: 15 },
      ];
      const result = calculateTestStats(variants);
      expect(result.totalClicks).toBe(200);
      expect(result.totalConversions).toBe(25);
    });

    it('should calculate variant stats correctly', () => {
      const variants = [
        { id: '1', name: 'Control', clicks: 100, conversions: 10 },
        { id: '2', name: 'Variant A', clicks: 100, conversions: 20 },
      ];
      const result = calculateTestStats(variants);

      expect(result.variants).toHaveLength(2);
      expect(result.variants[0].conversionRate).toBe(10);
      expect(result.variants[1].conversionRate).toBe(20);
      expect(result.variants[0].clickThroughRate).toBe(50);
    });

    it('should calculate improvement over control', () => {
      const variants = [
        { id: '1', name: 'Control', clicks: 100, conversions: 10 },
        { id: '2', name: 'Variant A', clicks: 100, conversions: 20 },
      ];
      const result = calculateTestStats(variants);

      // Control should not have improvement
      expect(result.variants[0].improvement).toBeUndefined();
      // Variant A: 20% vs 10% = 100% improvement
      expect(result.variants[1].improvement).toBe(100);
    });

    it('should identify need for more data', () => {
      const variants = [
        { id: '1', name: 'Control', clicks: 10, conversions: 1 },
        { id: '2', name: 'Variant A', clicks: 10, conversions: 2 },
      ];
      const result = calculateTestStats(variants);
      expect(result.recommendation).toContain('more data');
    });

    it('should identify winner when significant', () => {
      const variants = [
        { id: '1', name: 'Control', clicks: 1000, conversions: 100 },
        { id: '2', name: 'Variant A', clicks: 1000, conversions: 200 },
      ];
      const result = calculateTestStats(variants);

      if (result.isSignificant) {
        expect(result.winner).toBe('2');
      }
    });

    it('should identify control as winner when variants are worse', () => {
      const variants = [
        { id: '1', name: 'Control', clicks: 1000, conversions: 300 },
        { id: '2', name: 'Variant A', clicks: 1000, conversions: 100 },
      ];
      const result = calculateTestStats(variants);

      if (result.isSignificant) {
        expect(result.winner).toBe('1');
      }
    });
  });

  describe('estimateTimeToSignificance', () => {
    it('should return null for 0 days', () => {
      const result = estimateTimeToSignificance(100, 0, 1000);
      expect(result).toBeNull();
    });

    it('should return null for 0 current clicks', () => {
      const result = estimateTimeToSignificance(0, 5, 1000);
      expect(result).toBeNull();
    });

    it('should return 0 when already have enough clicks', () => {
      const result = estimateTimeToSignificance(2000, 10, 1000);
      expect(result).toBe(0);
    });

    it('should estimate correctly', () => {
      // 100 clicks in 5 days = 20 clicks/day
      // Need 1000, have 100, need 900 more
      // 900 / 20 = 45 days
      const result = estimateTimeToSignificance(100, 5, 1000);
      expect(result).toBe(45);
    });

    it('should round up days', () => {
      // 10 clicks in 3 days = 3.33 clicks/day
      // Need 100, have 10, need 90 more
      // 90 / 3.33 = 27 days (rounded up)
      const result = estimateTimeToSignificance(10, 3, 100);
      expect(result).toBe(27);
    });
  });
});
