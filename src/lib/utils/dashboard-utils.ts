/**
 * Calculate streak for a single entity (focus area or habit).
 * Counts consecutive days ending on `today` where a checkin/completion exists.
 */
export function calcStreak(dates: string[], today: string): number {
  const dateSet = new Set(dates)
  let streak = 0
  const d = new Date(today)
  while (dateSet.has(d.toISOString().split('T')[0])) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/**
 * Calculate overall focus streak: consecutive days ending on `today`
 * where the user checked in at least one focus area.
 */
export function calcOverallFocusStreak(allCheckinDates: string[], today: string): number {
  return calcStreak(allCheckinDates, today)
}

/**
 * Alias for calcStreak — used for habit completion streaks.
 */
export function calcHabitStreak(completionDates: string[], today: string): number {
  return calcStreak(completionDates, today)
}
