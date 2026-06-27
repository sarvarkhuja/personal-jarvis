// Pure, SSR-stable helpers for the weekly lift logger. `today` is always passed in,
// never read from the clock. Weeks are Monday-anchored, UTC, ISO weekday Mon=1..Sun=7.

export const LIFT_KEYS = [
  'bench',
  'squat',
  'deadlift',
  'overhead_press',
  'pull_ups',
] as const
export type LiftKey = (typeof LIFT_KEYS)[number]

export interface LiftDef {
  key: LiftKey
  display: string
  bodyweight: boolean
}

export const LIFTS: LiftDef[] = [
  { key: 'bench', display: 'BENCH PRESS', bodyweight: false },
  { key: 'squat', display: 'SQUAT', bodyweight: false },
  { key: 'deadlift', display: 'DEADLIFT', bodyweight: false },
  { key: 'overhead_press', display: 'OVERHEAD PRESS', bodyweight: false },
  { key: 'pull_ups', display: 'PULL-UPS', bodyweight: true },
]

export interface LiftEntry {
  exercise: LiftKey
  week_start: string
  weight_kg: number | null
  reps: number
}

export interface LiftRow {
  def: LiftDef
  current: { weight: number | null; reps: number } | null
  previous: { week_start: string; weight: number | null; reps: number } | null
  trend: { delta: number; dir: 'up' | 'down' | 'flat' } | null
  weightChanged: boolean
  history: { week_start: string; reps: number; weight: number | null }[]
}

function parseUTC(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, n: number): string {
  const d = parseUTC(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}

// Monday (UTC) of the week containing `date`.
export function weekStart(date: string): string {
  const d = parseUTC(date)
  const mondayIdx = (d.getUTCDay() + 6) % 7 // 0=Mon..6=Sun
  return addDays(date, -mondayIdx)
}

// ISO-8601 week number (1..53).
export function isoWeekNumber(date: string): number {
  const d = parseUTC(date)
  const dayNum = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // Thursday of this ISO week
  const thursday = d.getTime()
  d.setUTCMonth(0, 1) // Jan 1 of the Thursday's year
  if (d.getUTCDay() !== 4) {
    d.setUTCMonth(0, 1 + ((4 - d.getUTCDay() + 7) % 7)) // first Thursday of year
  }
  return 1 + Math.round((thursday - d.getTime()) / 604800000)
}

export function buildLiftRows(
  entries: LiftEntry[],
  today: string,
  weeks = 8,
): LiftRow[] {
  const thisWeek = weekStart(today)
  const windowStart = addDays(thisWeek, -7 * (weeks - 1))

  return LIFTS.map((def) => {
    const mine = entries
      .filter((e) => e.exercise === def.key)
      .filter((e) => e.week_start >= windowStart && e.week_start <= thisWeek)
      .sort((a, b) => a.week_start.localeCompare(b.week_start)) // oldest→newest

    const history = mine.map((e) => ({
      week_start: e.week_start,
      reps: e.reps,
      weight: e.weight_kg,
    }))

    const currentEntry = mine.find((e) => e.week_start === thisWeek) ?? null
    const current = currentEntry
      ? { weight: currentEntry.weight_kg, reps: currentEntry.reps }
      : null

    const previousEntry =
      [...mine].reverse().find((e) => e.week_start < thisWeek) ?? null
    const previous = previousEntry
      ? {
          week_start: previousEntry.week_start,
          weight: previousEntry.weight_kg,
          reps: previousEntry.reps,
        }
      : null

    let trend: LiftRow['trend'] = null
    let weightChanged = false
    if (current && previous) {
      const delta = current.reps - previous.reps
      trend = { delta, dir: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' }
      weightChanged = (current.weight ?? null) !== (previous.weight ?? null)
    }

    return { def, current, previous, trend, weightChanged, history }
  })
}
