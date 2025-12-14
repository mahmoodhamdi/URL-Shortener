/**
 * A/B Testing Statistical Analysis
 *
 * Provides statistical calculations for A/B test results including:
 * - Click-through rate (CTR)
 * - Conversion rate
 * - Statistical significance
 * - Winner determination
 */

export interface VariantStats {
  id: string;
  name: string;
  clicks: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
  improvement?: number; // Percentage improvement over control
}

export interface TestStats {
  totalClicks: number;
  totalConversions: number;
  variants: VariantStats[];
  winner: string | null;
  confidence: number;
  isSignificant: boolean;
  recommendation: string;
}

/**
 * Calculates the click-through rate.
 * Note: For A/B testing, this represents the proportion of clicks
 * a variant received out of total test clicks.
 */
export function calculateClickThroughRate(
  variantClicks: number,
  totalClicks: number
): number {
  if (totalClicks === 0) return 0;
  return (variantClicks / totalClicks) * 100;
}

/**
 * Calculates the conversion rate.
 * Conversion rate = (conversions / clicks) * 100
 */
export function calculateConversionRate(
  conversions: number,
  clicks: number
): number {
  if (clicks === 0) return 0;
  return (conversions / clicks) * 100;
}

/**
 * Calculates the percentage improvement of variant over control.
 * Improvement = ((variant - control) / control) * 100
 */
export function calculateImprovement(
  variantRate: number,
  controlRate: number
): number {
  if (controlRate === 0) {
    return variantRate > 0 ? 100 : 0;
  }
  return ((variantRate - controlRate) / controlRate) * 100;
}

/**
 * Standard normal cumulative distribution function.
 * Used for calculating p-values and confidence levels.
 */
export function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculates the Z-score for a two-proportion z-test.
 * Used to compare conversion rates between two variants.
 */
export function calculateZScore(
  conversions1: number,
  clicks1: number,
  conversions2: number,
  clicks2: number
): number {
  if (clicks1 === 0 || clicks2 === 0) return 0;

  const p1 = conversions1 / clicks1;
  const p2 = conversions2 / clicks2;

  // Pooled proportion
  const pooledP = (conversions1 + conversions2) / (clicks1 + clicks2);

  // Standard error
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / clicks1 + 1 / clicks2));

  if (se === 0) return 0;

  return (p1 - p2) / se;
}

/**
 * Calculates statistical significance using a two-proportion z-test.
 * Returns the confidence level (0-100) that the difference is not due to chance.
 */
export function calculateSignificance(
  conversions1: number,
  clicks1: number,
  conversions2: number,
  clicks2: number
): number {
  const zScore = calculateZScore(conversions1, clicks1, conversions2, clicks2);
  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
  // Convert to confidence level
  return (1 - pValue) * 100;
}

/**
 * Determines if the result is statistically significant.
 * Default threshold is 95% confidence (p < 0.05).
 */
export function isStatisticallySignificant(
  conversions1: number,
  clicks1: number,
  conversions2: number,
  clicks2: number,
  threshold: number = 95
): boolean {
  const confidence = calculateSignificance(
    conversions1,
    clicks1,
    conversions2,
    clicks2
  );
  return confidence >= threshold;
}

/**
 * Calculates minimum sample size needed for statistical significance.
 * Based on 80% power and 95% confidence level.
 */
export function calculateMinSampleSize(
  baselineConversionRate: number,
  minimumDetectableEffect: number
): number {
  // Using simplified formula for sample size calculation
  // n = 16 * p * (1-p) / (MDE)^2
  const p = baselineConversionRate / 100;
  const mde = minimumDetectableEffect / 100;

  if (mde === 0) return Infinity;

  const variance = p * (1 - p);
  const n = Math.ceil((16 * variance) / (mde * mde));

  return n;
}

interface VariantInput {
  id: string;
  name: string;
  clicks: number;
  conversions: number;
}

/**
 * Calculates comprehensive statistics for an A/B test.
 */
export function calculateTestStats(variants: VariantInput[]): TestStats {
  if (variants.length === 0) {
    return {
      totalClicks: 0,
      totalConversions: 0,
      variants: [],
      winner: null,
      confidence: 0,
      isSignificant: false,
      recommendation: 'No variants to analyze',
    };
  }

  const totalClicks = variants.reduce((sum, v) => sum + v.clicks, 0);
  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);

  // Calculate stats for each variant
  // Assume first variant is control
  const control = variants[0];
  const controlConversionRate = calculateConversionRate(
    control.conversions,
    control.clicks
  );

  const variantStats: VariantStats[] = variants.map((v, index) => {
    const conversionRate = calculateConversionRate(v.conversions, v.clicks);
    const clickThroughRate = calculateClickThroughRate(v.clicks, totalClicks);

    return {
      id: v.id,
      name: v.name,
      clicks: v.clicks,
      conversions: v.conversions,
      clickThroughRate,
      conversionRate,
      improvement: index === 0
        ? undefined
        : calculateImprovement(conversionRate, controlConversionRate),
    };
  });

  // Determine winner and significance
  let winner: string | null = null;
  let maxConfidence = 0;
  let isSignificant = false;
  let bestImprovement = 0;

  // Compare each variant against control
  for (let i = 1; i < variants.length; i++) {
    const variant = variants[i];
    const confidence = calculateSignificance(
      variant.conversions,
      variant.clicks,
      control.conversions,
      control.clicks
    );

    const variantRate = calculateConversionRate(variant.conversions, variant.clicks);
    const improvement = calculateImprovement(variantRate, controlConversionRate);

    if (confidence > maxConfidence && improvement > 0) {
      maxConfidence = confidence;
      if (confidence >= 95) {
        isSignificant = true;
        if (improvement > bestImprovement) {
          winner = variant.id;
          bestImprovement = improvement;
        }
      }
    }
  }

  // If no variant beats control, check if control is significantly better
  if (!winner && variants.length > 1) {
    const bestVariant = variants
      .slice(1)
      .reduce((best, v) =>
        calculateConversionRate(v.conversions, v.clicks) >
        calculateConversionRate(best.conversions, best.clicks)
          ? v
          : best
      );

    const variantRate = calculateConversionRate(
      bestVariant.conversions,
      bestVariant.clicks
    );

    if (controlConversionRate > variantRate) {
      const confidence = calculateSignificance(
        control.conversions,
        control.clicks,
        bestVariant.conversions,
        bestVariant.clicks
      );
      if (confidence >= 95) {
        winner = control.id;
        maxConfidence = confidence;
        isSignificant = true;
      }
    }
  }

  // Generate recommendation
  let recommendation: string;
  if (totalClicks < 100) {
    recommendation = 'Need more data: Collect at least 100 clicks per variant';
  } else if (!isSignificant) {
    recommendation = 'No significant difference detected yet. Continue the test.';
  } else if (winner === control.id) {
    recommendation = `Control (${control.name}) is the winner. Consider keeping the original.`;
  } else {
    const winnerVariant = variants.find(v => v.id === winner);
    const winnerStats = variantStats.find(v => v.id === winner);
    recommendation = `${winnerVariant?.name || 'Variant'} is the winner with ${winnerStats?.improvement?.toFixed(1)}% improvement. Consider implementing this variant.`;
  }

  return {
    totalClicks,
    totalConversions,
    variants: variantStats,
    winner,
    confidence: maxConfidence,
    isSignificant,
    recommendation,
  };
}

/**
 * Estimates time to significance based on current click rate.
 */
export function estimateTimeToSignificance(
  currentClicks: number,
  daysSinceStart: number,
  requiredClicks: number
): number | null {
  if (daysSinceStart === 0 || currentClicks === 0) return null;

  const clicksPerDay = currentClicks / daysSinceStart;
  if (clicksPerDay === 0) return null;

  const remainingClicks = requiredClicks - currentClicks;
  if (remainingClicks <= 0) return 0;

  return Math.ceil(remainingClicks / clicksPerDay);
}
