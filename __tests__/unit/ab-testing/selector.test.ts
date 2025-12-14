import { describe, it, expect, vi } from 'vitest';
import {
  normalizeWeights,
  validateWeights,
  selectVariant,
  selectVariantDeterministic,
  hashString,
  createVisitorId,
  Variant,
} from '@/lib/ab-testing/selector';

describe('A/B Testing Selector', () => {
  describe('normalizeWeights', () => {
    it('should return empty array for empty input', () => {
      const result = normalizeWeights([]);
      expect(result).toEqual([]);
    });

    it('should not modify weights that sum to 100', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 50 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 50 },
      ];
      const result = normalizeWeights(variants);
      expect(result[0].weight).toBe(50);
      expect(result[1].weight).toBe(50);
    });

    it('should normalize weights that do not sum to 100', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 30 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 70 },
      ];
      const result = normalizeWeights(variants);
      const total = result.reduce((sum, v) => sum + v.weight, 0);
      expect(total).toBe(100);
    });

    it('should handle weights summing to 200', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 100 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 100 },
      ];
      const result = normalizeWeights(variants);
      const total = result.reduce((sum, v) => sum + v.weight, 0);
      expect(total).toBe(100);
      expect(result[0].weight).toBe(50);
      expect(result[1].weight).toBe(50);
    });

    it('should distribute equally when all weights are 0', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 0 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 0 },
      ];
      const result = normalizeWeights(variants);
      expect(result[0].weight).toBe(50);
      expect(result[1].weight).toBe(50);
    });

    it('should handle 3 variants with zero weights', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 0 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 0 },
        { id: '3', name: 'C', url: 'http://c.com', weight: 0 },
      ];
      const result = normalizeWeights(variants);
      const total = result.reduce((sum, v) => sum + v.weight, 0);
      expect(total).toBe(100);
    });

    it('should preserve variant properties', () => {
      const variants: Variant[] = [
        { id: '1', name: 'Control', url: 'http://original.com', weight: 60 },
        { id: '2', name: 'Variant A', url: 'http://variant.com', weight: 40 },
      ];
      const result = normalizeWeights(variants);
      expect(result[0].id).toBe('1');
      expect(result[0].name).toBe('Control');
      expect(result[0].url).toBe('http://original.com');
    });
  });

  describe('validateWeights', () => {
    it('should fail for empty array', () => {
      const result = validateWeights([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one variant is required');
    });

    it('should fail for single variant', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 100 },
      ];
      const result = validateWeights(variants);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least two variants are required for A/B testing');
    });

    it('should fail for negative weight', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: -10 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 50 },
      ];
      const result = validateWeights(variants);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail for weight greater than 100', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 150 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 50 },
      ];
      const result = validateWeights(variants);
      expect(result.valid).toBe(false);
    });

    it('should fail for total weight of 0', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 0 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 0 },
      ];
      const result = validateWeights(variants);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total weight cannot be 0');
    });

    it('should pass for valid weights', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 50 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 50 },
      ];
      const result = validateWeights(variants);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for weights not summing to 100', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 30 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 70 },
      ];
      const result = validateWeights(variants);
      expect(result.valid).toBe(true);
    });
  });

  describe('selectVariant', () => {
    it('should return null for empty array', () => {
      const result = selectVariant([]);
      expect(result).toBeNull();
    });

    it('should return a valid variant', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 50 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 50 },
      ];
      const result = selectVariant(variants);
      expect(result).not.toBeNull();
      expect(result?.variant).toBeDefined();
      expect(['1', '2']).toContain(result?.variant.id);
    });

    it('should include selectedAt timestamp', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 50 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 50 },
      ];
      const result = selectVariant(variants);
      expect(result?.selectedAt).toBeInstanceOf(Date);
    });

    it('should always select variant with 100% weight', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 100 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 0 },
      ];
      // Run multiple times to verify
      for (let i = 0; i < 10; i++) {
        const result = selectVariant(variants);
        expect(result?.variant.id).toBe('1');
      }
    });

    it('should respect weight distribution over many selections', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 70 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 30 },
      ];

      const counts: Record<string, number> = { '1': 0, '2': 0 };
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const result = selectVariant(variants);
        if (result) {
          counts[result.variant.id]++;
        }
      }

      // With 1000 iterations, we expect roughly 70% for variant 1
      // Allow for statistical variance (±10%)
      const ratio = counts['1'] / iterations;
      expect(ratio).toBeGreaterThan(0.6);
      expect(ratio).toBeLessThan(0.8);
    });
  });

  describe('selectVariantDeterministic', () => {
    it('should return null for empty array', () => {
      const result = selectVariantDeterministic([], 'test-id');
      expect(result).toBeNull();
    });

    it('should return consistent results for same identifier', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 50 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 50 },
      ];

      const identifier = 'test-visitor-123';
      const results: string[] = [];

      for (let i = 0; i < 10; i++) {
        const result = selectVariantDeterministic(variants, identifier);
        results.push(result?.variant.id || '');
      }

      // All results should be the same
      expect(new Set(results).size).toBe(1);
    });

    it('should return different results for different identifiers', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 50 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 50 },
      ];

      const results = new Set<string>();

      // Generate many different identifiers
      for (let i = 0; i < 100; i++) {
        const result = selectVariantDeterministic(variants, `visitor-${i}`);
        if (result) {
          results.add(result.variant.id);
        }
      }

      // With 50/50 distribution, we should see both variants
      expect(results.size).toBe(2);
    });

    it('should include selectedAt timestamp', () => {
      const variants: Variant[] = [
        { id: '1', name: 'A', url: 'http://a.com', weight: 50 },
        { id: '2', name: 'B', url: 'http://b.com', weight: 50 },
      ];

      const result = selectVariantDeterministic(variants, 'test');
      expect(result?.selectedAt).toBeInstanceOf(Date);
    });
  });

  describe('hashString', () => {
    it('should return a number', () => {
      const result = hashString('test');
      expect(typeof result).toBe('number');
    });

    it('should return consistent results for same input', () => {
      const hash1 = hashString('test-string');
      const hash2 = hashString('test-string');
      expect(hash1).toBe(hash2);
    });

    it('should return different results for different inputs', () => {
      const hash1 = hashString('test1');
      const hash2 = hashString('test2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return positive number', () => {
      const hash = hashString('negative-test');
      expect(hash).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty string', () => {
      const hash = hashString('');
      expect(typeof hash).toBe('number');
    });

    it('should handle unicode characters', () => {
      const hash = hashString('مرحبا العالم');
      expect(typeof hash).toBe('number');
      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createVisitorId', () => {
    it('should create ID from all parameters', () => {
      const id = createVisitorId('test-123', '192.168.1.1', 'Mozilla/5.0');
      expect(id).toBe('test-123:192.168.1.1:Mozilla/5.0');
    });

    it('should handle null IP', () => {
      const id = createVisitorId('test-123', null, 'Mozilla/5.0');
      expect(id).toBe('test-123:unknown-ip:Mozilla/5.0');
    });

    it('should handle null user agent', () => {
      const id = createVisitorId('test-123', '192.168.1.1', null);
      expect(id).toBe('test-123:192.168.1.1:unknown-ua');
    });

    it('should handle all null values', () => {
      const id = createVisitorId('test-123', null, null);
      expect(id).toBe('test-123:unknown-ip:unknown-ua');
    });

    it('should create unique IDs for different tests', () => {
      const id1 = createVisitorId('test-1', '192.168.1.1', 'Mozilla/5.0');
      const id2 = createVisitorId('test-2', '192.168.1.1', 'Mozilla/5.0');
      expect(id1).not.toBe(id2);
    });
  });
});
