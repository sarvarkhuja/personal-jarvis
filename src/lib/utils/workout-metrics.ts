// Pure, SSR-stable helpers for the Workout "Recomp Instrument".
//
// The hero plots up to 30 days of body-weight as a dot-stream converging on a
// dashed target rule, with a least-squares regression line that is projected
// forward until it crosses the target — yielding an honest ETA. All geometry is
// returned in a normalised [0..1] space (x left→right, y bottom→top) so the
// component is a dumb renderer. `today` is always passed in (never read from the
// clock) to keep server render deterministic.

const DAY = 86_400_000
const WINDOW_DAYS = 30
const MIN_POINTS = 4 // below this we refuse to project — no fantasy ETA
const FUTURE_CAP_DAYS = 28 // furthest into the future the field will draw
const FLAT_RATE = 0.05 // |kg/week| under which the trend reads as "holding"
const ARRIVED_BAND = 0.2 // within this many kg of target = arrived

export type RecompStatus =
  | 'converging' // trending toward target → green
  | 'diverging' // trending away from target → red
  | 'flat' // holding / arrived → neutral
  | 'no-target' // enough data, but no target weight set
  | 'insufficient' // too few weigh-ins to say anything

export interface WeighInInput {
  date: string // YYYY-MM-DD
  weight: number | null
}

export interface RecompLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface RecompDot {
  x: number
  y: number
  date: string
  weight: number
  isLast: boolean
}

export interface RecompModel {
  status: RecompStatus
  currentWeight: number | null
  currentDateLabel: string | null
  targetWeight: number | null
  deltaToGo: number | null // current - target (positive = above target)
  thirtyDayDelta: number | null // current - earliest in window
  ratePerWeek: number | null // signed kg/week from the fit
  weighInCount: number
  etaDays: number | null
  etaDateLabel: string | null
  // normalised render geometry (0..1; y is fraction UP from the baseline)
  dots: RecompDot[]
  targetY: number | null
  nowX: number
  regression: RecompLine | null
  projection: RecompLine | null
  etaTick: { x: number; y: number } | null
  sentence: string
}

function parseUTC(d: string): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, day ?? 1)
}

/**
 * Format a 'YYYY-MM-DD' string in en-GB without timezone drift. A date-only
 * string parses as UTC midnight, so formatting with the local timezone would
 * shift the day back in negative-UTC-offset regions — build the date in UTC.
 */
export function formatUTCDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(parseUTC(iso)).toLocaleDateString('en-GB', opts)
}

function addDays(d: string, n: number): string {
  return new Date(parseUTC(d) + n * DAY).toISOString().slice(0, 10)
}

function formatDay(iso: string): string {
  return new Date(parseUTC(iso))
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    .toUpperCase()
}

export function linearFit(
  points: { x: number; y: number }[],
): { slope: number; intercept: number } | null {
  const n = points.length
  if (n < 2) return null
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0
  for (const p of points) {
    sx += p.x
    sy += p.y
    sxx += p.x * p.x
    sxy += p.x * p.y
  }
  const denom = n * sxx - sx * sx
  if (denom === 0) return null // all x identical → vertical, undefined slope
  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n
  return { slope, intercept }
}

export function buildRecompModel(
  weighIns: WeighInInput[],
  targetWeight: number | null,
  today: string,
): RecompModel {
  const todayMs = parseUTC(today)
  const windowStartMs = todayMs - (WINDOW_DAYS - 1) * DAY
  const todayIndex = WINDOW_DAYS - 1 // 29

  const pts = weighIns
    .filter((w) => w.weight != null && Number.isFinite(Number(w.weight)))
    .map((w) => ({ date: w.date, y: Number(w.weight), ms: parseUTC(w.date) }))
    .filter((w) => w.ms >= windowStartMs && w.ms <= todayMs)
    .sort((a, b) => a.ms - b.ms)
    .map((w) => ({ x: Math.round((w.ms - windowStartMs) / DAY), y: w.y, date: w.date }))

  const count = pts.length
  const currentWeight = count ? pts[count - 1].y : null
  const currentDateLabel = count ? formatDay(pts[count - 1].date) : null
  const earliest = count ? pts[0].y : null
  const thirtyDayDelta =
    currentWeight != null && earliest != null
      ? Math.round((currentWeight - earliest) * 10) / 10
      : null
  const target =
    targetWeight != null && Number.isFinite(Number(targetWeight))
      ? Number(targetWeight)
      : null
  const deltaToGo =
    currentWeight != null && target != null
      ? Math.round((currentWeight - target) * 10) / 10
      : null

  const fit = count >= MIN_POINTS ? linearFit(pts.map((p) => ({ x: p.x, y: p.y }))) : null
  const ratePerWeek = fit ? Math.round(fit.slope * 7 * 1000) / 1000 : null

  // ── classify ──────────────────────────────────────────────────────────────
  let status: RecompStatus
  if (count < MIN_POINTS) status = 'insufficient'
  else if (target == null) status = 'no-target'
  else if (Math.abs((currentWeight as number) - target) <= ARRIVED_BAND) status = 'flat'
  else {
    const needLoss = target < (currentWeight as number)
    const m = (fit as { slope: number }).slope
    if (Math.abs(ratePerWeek as number) < FLAT_RATE) status = 'flat'
    else if ((needLoss && m < 0) || (!needLoss && m > 0)) status = 'converging'
    else status = 'diverging'
  }

  // ── ETA (only when genuinely converging) ───────────────────────────────────
  let etaDays: number | null = null
  let etaDateLabel: string | null = null
  let etaDayIndex: number | null = null
  if (status === 'converging' && fit && target != null) {
    const idx = (target - fit.intercept) / fit.slope
    const d = idx - todayIndex
    if (d > 0.5) {
      etaDays = Math.round(d)
      etaDayIndex = idx
      etaDateLabel = formatDay(addDays(today, Math.round(d)))
    } else {
      // the fit says we're already at/past target — read as holding, not arriving
      status = 'flat'
    }
  }

  // ── geometry ────────────────────────────────────────────────────────────────
  const ys = pts.map((p) => p.y)
  let yLo = ys.length ? Math.min(...ys) : 0
  let yHi = ys.length ? Math.max(...ys) : 1
  if (target != null) {
    yLo = Math.min(yLo, target)
    yHi = Math.max(yHi, target)
  }
  const pad = Math.max((yHi - yLo) * 0.18, 0.5)
  yLo -= pad
  yHi += pad
  const span = yHi - yLo || 1
  const ny = (w: number) => (w - yLo) / span

  let xEnd = todayIndex
  if (etaDays != null) xEnd = todayIndex + Math.min(etaDays, FUTURE_CAP_DAYS)
  const nx = (idx: number) => (xEnd > 0 ? idx / xEnd : 0)

  const dots: RecompDot[] = pts.map((p, i) => ({
    x: nx(p.x),
    y: ny(p.y),
    date: p.date,
    weight: p.y,
    isLast: i === count - 1,
  }))
  const nowX = nx(todayIndex)
  const targetY = target != null ? ny(target) : null

  let regression: RecompLine | null = null
  let projection: RecompLine | null = null
  let etaTick: { x: number; y: number } | null = null
  if (fit) {
    const fy = (d: number) => fit.slope * d + fit.intercept
    regression = { x1: nx(0), y1: ny(fy(0)), x2: nowX, y2: ny(fy(todayIndex)) }
    if (etaDays != null && etaDayIndex != null) {
      const projEnd = Math.min(etaDayIndex, xEnd)
      projection = {
        x1: nowX,
        y1: ny(fy(todayIndex)),
        x2: nx(projEnd),
        y2: ny(fy(projEnd)),
      }
      if (etaDayIndex <= xEnd + 1e-6 && targetY != null) {
        etaTick = { x: nx(etaDayIndex), y: targetY }
      }
    }
  }

  return {
    status,
    currentWeight,
    currentDateLabel,
    targetWeight: target,
    deltaToGo,
    thirtyDayDelta,
    ratePerWeek,
    weighInCount: count,
    etaDays,
    etaDateLabel,
    dots,
    targetY,
    nowX,
    regression,
    projection,
    etaTick,
    sentence: buildSentence({
      status,
      currentWeight,
      target,
      thirtyDayDelta,
      ratePerWeek,
      etaDateLabel,
    }),
  }
}

function buildSentence(m: {
  status: RecompStatus
  currentWeight: number | null
  target: number | null
  thirtyDayDelta: number | null
  ratePerWeek: number | null
  etaDateLabel: string | null
}): string {
  const kg = (n: number) => `${Math.abs(n).toFixed(1)} kg`
  switch (m.status) {
    case 'insufficient':
      return 'Log a few more weigh-ins to chart your trajectory.'
    case 'no-target':
      if (m.thirtyDayDelta != null && Math.abs(m.thirtyDayDelta) >= 0.1) {
        return `${m.thirtyDayDelta < 0 ? 'Down' : 'Up'} ${kg(
          m.thirtyDayDelta,
        )} over 30 days. Set a target weight to project an ETA.`
      }
      return 'Set a target weight to project your trajectory.'
    case 'flat':
      return m.target != null && m.currentWeight != null
        ? `Holding around ${m.currentWeight.toFixed(1)} kg — ${kg(
            m.currentWeight - m.target,
          )} from your ${m.target} kg target.`
        : 'Holding steady.'
    case 'diverging':
      return `Up ${
        m.thirtyDayDelta != null ? kg(m.thirtyDayDelta) : 'over the month'
      } — moving away from your ${m.target} kg target.`
    case 'converging': {
      const dir =
        m.thirtyDayDelta != null && m.thirtyDayDelta !== 0
          ? `${m.thirtyDayDelta < 0 ? 'Down' : 'Up'} ${kg(m.thirtyDayDelta)} in 30 days · `
          : ''
      const rate =
        m.ratePerWeek != null ? `about ${kg(m.ratePerWeek)}/week` : 'on track'
      return `${dir}${rate} — reaching ${m.target} kg around ${m.etaDateLabel}.`
    }
  }
}

// ── girth tape-rail helpers ───────────────────────────────────────────────────

export type GirthKey = 'waist_cm' | 'arm_cm' | 'leg_cm' | 'forearm_cm' | 'calf_cm'

export const GIRTH_CHANNELS: {
  key: GirthKey
  label: string
  goodDir: 'down' | 'up'
  primary?: boolean
}[] = [
  { key: 'waist_cm', label: 'WAIST', goodDir: 'down', primary: true },
  { key: 'arm_cm', label: 'ARM', goodDir: 'up' },
  { key: 'leg_cm', label: 'LEG', goodDir: 'up' },
  { key: 'forearm_cm', label: 'FOREARM', goodDir: 'up' },
  { key: 'calf_cm', label: 'CALF', goodDir: 'up' },
]

/** `recent` is newest-first (matches the body_metrics query order). */
export function girthDelta(
  recent: Record<string, unknown>[],
  key: GirthKey,
): { latest: number | null; delta: number | null } {
  const vals = recent
    .filter((r) => r[key] != null && Number.isFinite(Number(r[key])))
    .map((r) => Number(r[key]))
  if (vals.length === 0) return { latest: null, delta: null }
  if (vals.length === 1) return { latest: vals[0], delta: null }
  const latest = vals[0]
  const earliest = vals[vals.length - 1]
  return { latest, delta: Math.round((latest - earliest) * 10) / 10 }
}

export function girthStatus(
  delta: number | null,
  goodDir: 'down' | 'up',
): 'good' | 'bad' | 'neutral' {
  if (delta == null || Math.abs(delta) < 0.1) return 'neutral'
  const good = goodDir === 'down' ? delta < 0 : delta > 0
  return good ? 'good' : 'bad'
}
