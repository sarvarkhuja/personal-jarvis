import { describe, it, expect } from 'vitest'
import {
  calcStreak,
  calcOverallFocusStreak,
  aggregateExpensesByMonth,
  calcHabitStreak,
} from '../dashboard-utils'

describe('calcStreak', () => {
  it('returns 0 when no checkins', () => {
    expect(calcStreak([], '2026-03-29')).toBe(0)
  })

  it('returns 1 for single checkin today', () => {
    expect(calcStreak(['2026-03-29'], '2026-03-29')).toBe(1)
  })

  it('counts consecutive days ending today', () => {
    expect(calcStreak(['2026-03-27', '2026-03-28', '2026-03-29'], '2026-03-29')).toBe(3)
  })

  it('breaks streak on gap', () => {
    expect(calcStreak(['2026-03-25', '2026-03-28', '2026-03-29'], '2026-03-29')).toBe(2)
  })

  it('returns 0 if no checkin today', () => {
    expect(calcStreak(['2026-03-27', '2026-03-28'], '2026-03-29')).toBe(0)
  })
})

describe('calcOverallFocusStreak', () => {
  it('counts consecutive days with at least one checkin', () => {
    const dates = ['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-29']
    expect(calcOverallFocusStreak(dates, '2026-03-29')).toBe(3)
  })
})

describe('aggregateExpensesByMonth', () => {
  it('sums pence by YYYY-MM key', () => {
    const expenses = [
      { date: '2026-03-01', amount_pence: 1000 },
      { date: '2026-03-15', amount_pence: 500 },
      { date: '2026-02-10', amount_pence: 2000 },
    ]
    const result = aggregateExpensesByMonth(expenses)
    expect(result['2026-03']).toBe(1500)
    expect(result['2026-02']).toBe(2000)
  })
})

describe('calcHabitStreak', () => {
  it('counts consecutive completions ending today', () => {
    expect(calcHabitStreak(['2026-03-28', '2026-03-29'], '2026-03-29')).toBe(2)
  })
})
