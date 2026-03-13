import { TARGET_INTENSITY } from '@shared/constants';
import type { PoolMemberInput } from '@core/domain';

/**
 * Compute the percentage difference between a comparison and baseline intensity.
 * Formula: ((comparison / baseline) − 1) × 100
 */
export function computePercentDiff(
  comparisonIntensity: number,
  baselineIntensity: number,
): number {
  if (baselineIntensity === 0) return 0;
  return ((comparisonIntensity / baselineIntensity) - 1) * 100;
}

/**
 * Returns true when the GHG intensity is at or below the target threshold.
 */
export function isCompliant(ghgIntensity: number): boolean {
  return ghgIntensity <= TARGET_INTENSITY;
}

/**
 * Validate pool members according to Article 21 rules:
 * - Sum of adjusted CB must be >= 0
 * - At least two members required
 */
export function validatePool(members: readonly PoolMemberInput[]): {
  valid: boolean;
  reason?: string;
} {
  if (members.length < 2) {
    return { valid: false, reason: 'A pool requires at least 2 members.' };
  }

  const sum = members.reduce((acc, m) => acc + m.cbBefore, 0);
  if (sum < 0) {
    return { valid: false, reason: 'Total adjusted CB of the pool must be ≥ 0.' };
  }

  return { valid: true };
}
