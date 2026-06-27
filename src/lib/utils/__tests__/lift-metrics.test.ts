import { describe, it, expect } from 'vitest'
import {
  weekStart,
  isoWeekNumber,
  addDays,
  buildLiftRows,
  LIFTS,
  LIFT_KEYS,
  type LiftEntry,
} from '../lift-metrics'

describe('weekStart (Monday-anchored, UTC)', () => {
  it('returns the same date for a Monday', () => {
    expect(weekStart('2026-06-22')).toBe('2026-06-22')
  })
  it('maps a mid-week day back to Monday', () => {
    expect(weekStart('2026-06-27')).toBe('2026-06-22') // Saturday
  })
  it('maps Sunday back to the same week Monday', () => {
    expect(weekStart('2026-06-28')).toBe('2026-06-22')
  })
  it('crosses a month boundary', () => {
    expect(weekStart('2026-07-01')).toBe('2026-06-29') // Wed -> Mon
  })
})

describe('addDays', () => {
  it('adds and subtracts UTC days across months', () => {
    expect(addDays('2026-06-22', 6)).toBe('2026-06-28')
    expect(addDays('2026-06-22', -7)).toBe('2026-06-15')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('isoWeekNumber (ISO-8601)', () => {
  it('Jan 1 2026 (Thursday) is week 1', () => {
    expect(isoWeekNumber('2026-01-01')).toBe(1)
  })
  it('2026-06-27 is week 26', () => {
    expect(isoWeekNumber('2026-06-27')).toBe(26)
  })
  it('Monday 2025-12-29 belongs to ISO week 1', () => {
    expect(isoWeekNumber('2025-12-29')).toBe(1)
  })
  it('2027-01-01 (Friday) belongs to week 53 of the prior year', () => {
    expect(isoWeekNumber('2027-01-01')).toBe(53)
  })
})

describe('LIFTS / LIFT_KEYS', () => {
  it('has the five lifts in order', () => {
    expect(LIFT_KEYS).toEqual([
      'bench', 'squat', 'deadlift', 'overhead_press', 'pull_ups',
    ])
    expect(LIFTS.map((l) => l.key)).toEqual([...LIFT_KEYS])
  })
  it('marks only pull_ups as bodyweight', () => {
    expect(LIFTS.find((l) => l.key === 'pull_ups')?.bodyweight).toBe(true)
    expect(LIFTS.find((l) => l.key === 'bench')?.bodyweight).toBe(false)
  })
})

const TODAY = '2026-06-27' // week of Mon 2026-06-22
const THIS = '2026-06-22'
const LAST = '2026-06-15'
const TWO_AGO = '2026-06-08'

function entry(
  exercise: LiftEntry['exercise'],
  week_start: string,
  weight_kg: number | null,
  reps: number,
): LiftEntry {
  return { exercise, week_start, weight_kg, reps }
}

describe('buildLiftRows', () => {
  it('returns a row per lift with no data when empty', () => {
    const rows = buildLiftRows([], TODAY)
    expect(rows).toHaveLength(5)
    for (const r of rows) {
      expect(r.current).toBeNull()
      expect(r.previous).toBeNull()
      expect(r.trend).toBeNull()
      expect(r.weightChanged).toBe(false)
      expect(r.history).toEqual([])
    }
  })

  it('computes an upward rep trend vs the previous logged week', () => {
    const rows = buildLiftRows(
      [entry('bench', LAST, 80, 8), entry('bench', THIS, 80, 9)],
      TODAY,
    )
    const bench = rows.find((r) => r.def.key === 'bench')!
    expect(bench.current).toEqual({ weight: 80, reps: 9 })
    expect(bench.previous).toEqual({ week_start: LAST, weight: 80, reps: 8 })
    expect(bench.trend).toEqual({ delta: 1, dir: 'up' })
    expect(bench.weightChanged).toBe(false)
    expect(bench.history.map((h) => h.reps)).toEqual([8, 9])
  })

  it('reports a flat trend at equal reps and a down trend at fewer', () => {
    const flat = buildLiftRows(
      [entry('squat', LAST, 100, 5), entry('squat', THIS, 100, 5)],
      TODAY,
    ).find((r) => r.def.key === 'squat')!
    expect(flat.trend).toEqual({ delta: 0, dir: 'flat' })

    const down = buildLiftRows(
      [entry('deadlift', LAST, 120, 6), entry('deadlift', THIS, 120, 5)],
      TODAY,
    ).find((r) => r.def.key === 'deadlift')!
    expect(down.trend).toEqual({ delta: -1, dir: 'down' })
  })

  it('skips a gap week when finding the previous logged week', () => {
    const bench = buildLiftRows(
      [entry('bench', TWO_AGO, 80, 7), entry('bench', THIS, 80, 9)],
      TODAY,
    ).find((r) => r.def.key === 'bench')!
    expect(bench.previous?.week_start).toBe(TWO_AGO)
    expect(bench.trend).toEqual({ delta: 2, dir: 'up' })
  })

  it('flags weightChanged when the load moved', () => {
    const bench = buildLiftRows(
      [entry('bench', LAST, 80, 8), entry('bench', THIS, 82.5, 6)],
      TODAY,
    ).find((r) => r.def.key === 'bench')!
    expect(bench.weightChanged).toBe(true)
    expect(bench.trend).toEqual({ delta: -2, dir: 'down' })
  })

  it('handles bodyweight pull-ups (null weight) without a weight change', () => {
    const pull = buildLiftRows(
      [entry('pull_ups', LAST, null, 10), entry('pull_ups', THIS, null, 12)],
      TODAY,
    ).find((r) => r.def.key === 'pull_ups')!
    expect(pull.current).toEqual({ weight: null, reps: 12 })
    expect(pull.weightChanged).toBe(false)
    expect(pull.trend).toEqual({ delta: 2, dir: 'up' })
  })

  it('exposes previous for prefill even when this week is unlogged', () => {
    const bench = buildLiftRows([entry('bench', LAST, 80, 8)], TODAY).find(
      (r) => r.def.key === 'bench',
    )!
    expect(bench.current).toBeNull()
    expect(bench.previous).toEqual({ week_start: LAST, weight: 80, reps: 8 })
    expect(bench.trend).toBeNull()
  })

  it('limits history to the requested window and orders oldest→newest', () => {
    const entries: LiftEntry[] = []
    for (let i = 0; i < 12; i++) {
      entries.push(entry('bench', addDays(THIS, -7 * i), 80, 10 - i))
    }
    const bench = buildLiftRows(entries, TODAY, 8).find(
      (r) => r.def.key === 'bench',
    )!
    expect(bench.history).toHaveLength(8)
    const weeks = bench.history.map((h) => h.week_start)
    expect(weeks[0] < weeks[weeks.length - 1]).toBe(true)
    expect(weeks[weeks.length - 1]).toBe(THIS)
  })
})
