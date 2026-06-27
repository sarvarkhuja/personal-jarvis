import { describe, it, expect } from 'vitest'
import {
  calcStreak,
  calcOverallFocusStreak,
  aggregateExpensesByMonth,
  calcHabitStreak,
  formatUzs,
  formatUzsCompact,
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
  it('sums amount by YYYY-MM key', () => {
    const expenses = [
      { date: '2026-03-01', amount: 10_000 },
      { date: '2026-03-15', amount: 5_000 },
      { date: '2026-02-10', amount: 20_000 },
    ]
    const result = aggregateExpensesByMonth(expenses)
    expect(result['2026-03']).toBe(15_000)
    expect(result['2026-02']).toBe(20_000)
  })
})

describe('calcHabitStreak', () => {
  it('counts consecutive completions ending today', () => {
    expect(calcHabitStreak(['2026-03-28', '2026-03-29'], '2026-03-29')).toBe(2)
  })
})

describe('formatUzs', () => {
  it('adds thousands separators and so\'m suffix', () => {
    expect(formatUzs(12_500)).toBe("12,500 so'm")
    expect(formatUzs(0)).toBe("0 so'm")
    expect(formatUzs(1_250_000)).toBe("1,250,000 so'm")
  })
})

describe('formatUzsCompact', () => {
  it('uses K above 1,000', () => {
    expect(formatUzsCompact(12_500)).toBe("12.5K so'm")
    expect(formatUzsCompact(50_000)).toBe("50K so'm")
  })

  it('uses M above 1,000,000', () => {
    expect(formatUzsCompact(1_500_000)).toBe("1.5M so'm")
    expect(formatUzsCompact(2_000_000)).toBe("2M so'm")
  })

  it('falls back to full formatting under 1,000', () => {
    expect(formatUzsCompact(800)).toBe("800 so'm")
  })

  it('compacts negative amounts with a leading sign', () => {
    expect(formatUzsCompact(-1_500_000)).toBe("-1.5M so'm")
    expect(formatUzsCompact(-50_000)).toBe("-50K so'm")
    expect(formatUzsCompact(-800)).toBe("-800 so'm")
  })
})
