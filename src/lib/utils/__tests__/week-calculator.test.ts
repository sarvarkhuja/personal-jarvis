import { describe, it, expect, afterEach, vi } from 'vitest'
import { getCurrentProgrammePosition } from '../week-calculator'

describe('getCurrentProgrammePosition', () => {
  afterEach(() => vi.useRealTimers())

  function makeStartDate(daysAgo: number): Date {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(0, 0, 0, 0)
    return d
  }

  it('returns week 1 when programme starts today', () => {
    const result = getCurrentProgrammePosition(makeStartDate(0))
    expect(result.weekNumber).toBe(1)
  })

  it('returns week 2 after 7 days', () => {
    const result = getCurrentProgrammePosition(makeStartDate(7))
    expect(result.weekNumber).toBe(2)
  })

  it('returns week 12 after 84+ days (caps at 12)', () => {
    const result = getCurrentProgrammePosition(makeStartDate(100))
    expect(result.weekNumber).toBe(12)
  })

  it('identifies Block A for weeks 1-4', () => {
    expect(getCurrentProgrammePosition(makeStartDate(0)).blockName).toBe('A')
    expect(getCurrentProgrammePosition(makeStartDate(21)).blockName).toBe('A')
  })

  it('identifies Block B for weeks 5-8', () => {
    expect(getCurrentProgrammePosition(makeStartDate(28)).blockName).toBe('B')
  })

  it('identifies Block C for weeks 9-12', () => {
    expect(getCurrentProgrammePosition(makeStartDate(56)).blockName).toBe('C')
  })

  it('week 4 is a deload week', () => {
    const result = getCurrentProgrammePosition(makeStartDate(21))
    // week 4 = days 21-27
    expect(result.isDeloadWeek).toBe(true)
  })

  it('week 8 is a deload week', () => {
    const result = getCurrentProgrammePosition(makeStartDate(49))
    expect(result.isDeloadWeek).toBe(true)
  })

  it('week 3 is not a deload week', () => {
    const result = getCurrentProgrammePosition(makeStartDate(14))
    expect(result.isDeloadWeek).toBe(false)
  })

  it('identifies Monday as a training day', () => {
    vi.useFakeTimers()
    const monday = new Date('2026-03-30') // Known Monday
    vi.setSystemTime(monday)
    const result = getCurrentProgrammePosition(new Date('2026-03-30'))
    expect(result.isTrainingDay).toBe(true)
  })

  it('identifies Sunday as not a training day', () => {
    vi.useFakeTimers()
    const sunday = new Date('2026-03-29') // Known Sunday
    vi.setSystemTime(sunday)
    const result = getCurrentProgrammePosition(new Date('2026-03-29'))
    expect(result.isTrainingDay).toBe(false)
  })
})
