import type { FrequencyJson } from '@/lib/schemas/habits';

/** ISO weekday numbers Monday(1) … Sunday(7), in display order. */
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * Map a set of selected weekday numbers (ISO 1–7) to a habit frequency.
 * All seven days collapse to `daily`; any smaller set becomes `weekly`.
 *
 * Callers must ensure at least one day is selected — the form enforces this.
 * An empty array yields a `weekly` value the schema will (intentionally) reject.
 */
export function frequencyFromDays(days: number[]): FrequencyJson {
  const unique = Array.from(new Set(days)).sort((a, b) => a - b);
  if (unique.length === ALL_DAYS.length) return { type: 'daily' };
  return { type: 'weekly', days: unique };
}
