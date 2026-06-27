import { getISODay, parseISO } from 'date-fns';

export type FrequencyJson =
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] } // ISO weekday: 1=Mon, 7=Sun
  | { type: 'x_per_week'; count: number };

/**
 * Is this habit due on the given local-calendar date?
 *
 * - daily: always true.
 * - weekly: true iff the ISO weekday is in `days`.
 * - x_per_week: always true (the widget tracks how many of N have been
 *   completed in the current week; the schedule itself doesn't gate days).
 */
export function isHabitDueOn(frequency: FrequencyJson, date: string): boolean {
  switch (frequency.type) {
    case 'daily':
      return true;
    case 'weekly': {
      const isoDay = getISODay(parseISO(date));
      return frequency.days.includes(isoDay);
    }
    case 'x_per_week':
      return true;
  }
}
