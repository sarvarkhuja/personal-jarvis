import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/**
 * Returns the user-local YYYY-MM-DD for a UTC instant.
 * SPEC: every habit/medication log derives `log_date` server-side from
 * `logged_at` + the user's `profiles.timezone`. Never trust the client clock.
 */
export function toUserDate(utc: Date | string, tz: string): string {
  const d = typeof utc === 'string' ? new Date(utc) : utc;
  return formatInTimeZone(d, tz, 'yyyy-MM-dd');
}

/**
 * Returns the UTC instants that bound a user-local calendar day.
 * Useful for "today" queries: `logged_at >= startUtc AND logged_at < endUtc`.
 *
 * `date` is YYYY-MM-DD interpreted in `tz`. On DST transition days this
 * returns 23h or 25h spans, which is the desired behavior.
 */
export function userDayBounds(
  date: string,
  tz: string,
): { startUtc: Date; endUtc: Date } {
  const startUtc = fromZonedTime(`${date}T00:00:00`, tz);
  const endUtc = fromZonedTime(`${nextCalendarDay(date)}T00:00:00`, tz);
  return { startUtc, endUtc };
}

function nextCalendarDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  // Build a UTC noon (avoids any local-tz weirdness) on the next day.
  const t = Date.UTC(y, m - 1, d + 1, 12);
  const next = new Date(t);
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
