// Pure helpers for habit_logs rows. No I/O.

/**
 * Group raw habit_log rows into a map of `log_date -> distinct habit_ids`,
 * preserving first-seen order.
 *
 * A habit can legitimately have several rows on one day — a `counter` habit
 * `+1`'d repeatedly, a `timer` habit with multiple focus-session logs — and a
 * `check` habit can pick up an accidental duplicate from a double-tap. Views
 * that render one marker per habit per day (e.g. the month grid) need the
 * distinct set, not the raw multiset, or React sees duplicate keys.
 */
export function groupLoggedHabitIdsByDate(
  logs: ReadonlyArray<{ habit_id: string; log_date: string }>,
): Map<string, string[]> {
  const byDate = new Map<string, string[]>();
  const seenByDate = new Map<string, Set<string>>();
  for (const { log_date, habit_id } of logs) {
    let seen = seenByDate.get(log_date);
    if (!seen) {
      seen = new Set();
      seenByDate.set(log_date, seen);
      byDate.set(log_date, []);
    }
    if (!seen.has(habit_id)) {
      seen.add(habit_id);
      byDate.get(log_date)!.push(habit_id);
    }
  }
  return byDate;
}
