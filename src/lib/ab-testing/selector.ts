/**
 * A/B Testing Variant Selector
 *
 * Selects a variant based on weighted random selection.
 * Weights are percentages (1-100) that define the probability
 * of each variant being selected.
 */

export interface Variant {
  id: string;
  name: string;
  url: string;
  weight: number;
}

export interface SelectionResult {
  variant: Variant;
  selectedAt: Date;
}

/**
 * Normalizes variant weights to ensure they sum to 100.
 * If weights don't sum to 100, they are proportionally adjusted.
 */
export function normalizeWeights(variants: Variant[]): Variant[] {
  if (variants.length === 0) return [];

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);

  if (totalWeight === 0) {
    // Equal distribution if all weights are 0
    const equalWeight = Math.floor(100 / variants.length);
    const remainder = 100 - (equalWeight * variants.length);

    return variants.map((v, index) => ({
      ...v,
      weight: equalWeight + (index < remainder ? 1 : 0),
    }));
  }

  if (totalWeight === 100) {
    return variants;
  }

  // Proportionally adjust weights
  const normalizedVariants = variants.map(v => ({
    ...v,
    weight: Math.round((v.weight / totalWeight) * 100),
  }));

  // Ensure exact sum of 100 by adjusting the first variant
  const newTotal = normalizedVariants.reduce((sum, v) => sum + v.weight, 0);
  if (newTotal !== 100 && normalizedVariants.length > 0) {
    normalizedVariants[0].weight += 100 - newTotal;
  }

  return normalizedVariants;
}

/**
 * Validates that all variants have valid weights (1-100).
 */
export function validateWeights(variants: Variant[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (variants.length === 0) {
    errors.push('At least one variant is required');
    return { valid: false, errors };
  }

  if (variants.length < 2) {
    errors.push('At least two variants are required for A/B testing');
    return { valid: false, errors };
  }

  variants.forEach((variant, index) => {
    if (variant.weight < 0) {
      errors.push(`Variant ${index + 1} (${variant.name}) has negative weight: ${variant.weight}`);
    }
    if (variant.weight > 100) {
      errors.push(`Variant ${index + 1} (${variant.name}) has weight > 100: ${variant.weight}`);
    }
  });

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight === 0) {
    errors.push('Total weight cannot be 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Selects a variant based on weighted random selection.
 *
 * Algorithm:
 * 1. Generate a random number between 0 and 100
 * 2. Iterate through variants, accumulating weights
 * 3. When cumulative weight >= random number, select that variant
 */
export function selectVariant(variants: Variant[]): SelectionResult | null {
  if (variants.length === 0) return null;

  const normalizedVariants = normalizeWeights(variants);
  const random = Math.random() * 100;

  let cumulativeWeight = 0;
  for (const variant of normalizedVariants) {
    cumulativeWeight += variant.weight;
    if (random <= cumulativeWeight) {
      return {
        variant,
        selectedAt: new Date(),
      };
    }
  }

  // Fallback to last variant (should not happen with proper normalization)
  return {
    variant: normalizedVariants[normalizedVariants.length - 1],
    selectedAt: new Date(),
  };
}

/**
 * Selects a variant using a deterministic hash for consistent selection.
 * This ensures the same visitor always sees the same variant.
 */
export function selectVariantDeterministic(
  variants: Variant[],
  identifier: string
): SelectionResult | null {
  if (variants.length === 0) return null;

  const normalizedVariants = normalizeWeights(variants);

  // Generate a deterministic hash from the identifier
  const hash = hashString(identifier);
  const position = hash % 100;

  let cumulativeWeight = 0;
  for (const variant of normalizedVariants) {
    cumulativeWeight += variant.weight;
    if (position < cumulativeWeight) {
      return {
        variant,
        selectedAt: new Date(),
      };
    }
  }

  // Fallback to last variant
  return {
    variant: normalizedVariants[normalizedVariants.length - 1],
    selectedAt: new Date(),
  };
}

/**
 * Simple string hash function (djb2 algorithm).
 * Returns a number between 0 and 2^32-1.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Creates a visitor identifier for deterministic variant selection.
 * Combines IP, user agent, and test ID for uniqueness.
 */
export function createVisitorId(
  testId: string,
  ip: string | null,
  userAgent: string | null
): string {
  const parts = [
    testId,
    ip || 'unknown-ip',
    userAgent || 'unknown-ua',
  ];
  return parts.join(':');
}
