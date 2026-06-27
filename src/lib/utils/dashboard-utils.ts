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

/**
 * Aggregate expenses by month (YYYY-MM key), returning total amount per month.
 */
export function aggregateExpensesByMonth(
  expenses: { date: string; amount: number }[]
): Record<string, number> {
  return expenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.date.slice(0, 7) // 'YYYY-MM'
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {})
}

/**
 * Build last N month YYYY-MM keys in ascending order, ending with the current month.
 */
export function lastNMonthKeys(n: number): string[] {
  const keys: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const month = new Date(d.getFullYear(), d.getMonth() - i, 1)
    keys.push(month.toISOString().slice(0, 7))
  }
  return keys
}

const UZS_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** Format whole-sum UZS amount with thousands separators: 12500 → "12,500 so'm" */
export function formatUzs(amount: number): string {
  return `${UZS_FORMATTER.format(amount)} so'm`
}

/** Compact UZS formatting for tight UI: 1500000 → "1.5M so'm", -1500000 → "-1.5M so'm" */
export function formatUzsCompact(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const a = Math.abs(amount)
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toFixed(a % 1_000_000 === 0 ? 0 : 1)}M so'm`
  if (a >= 1_000) return `${sign}${(a / 1_000).toFixed(a % 1_000 === 0 ? 0 : 1)}K so'm`
  return `${sign}${formatUzs(a)}`
}
