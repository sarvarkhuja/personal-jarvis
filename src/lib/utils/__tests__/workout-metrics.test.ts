import { describe, it, expect } from 'vitest'
import {
  buildRecompModel,
  linearFit,
  girthDelta,
  girthStatus,
  type WeighInInput,
} from '../workout-metrics'

const TODAY = '2026-06-26'

/** Build a descending weigh-in series ending `endDate`, losing `perDay` kg/day. */
function series(
  start: number,
  perDay: number,
  days: number,
  endDate = TODAY,
): WeighInInput[] {
  const end = Date.UTC(
    Number(endDate.slice(0, 4)),
    Number(endDate.slice(5, 7)) - 1,
    Number(endDate.slice(8, 10)),
  )
  const out: WeighInInput[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end - i * 86_400_000).toISOString().slice(0, 10)
    out.push({ date: d, weight: +(start - (days - 1 - i) * perDay).toFixed(2) })
  }
  return out
}

describe('linearFit', () => {
  it('returns null with fewer than two points', () => {
    expect(linearFit([{ x: 0, y: 1 }])).toBeNull()
  })

  it('returns null when all x are identical', () => {
    expect(linearFit([{ x: 5, y: 1 }, { x: 5, y: 2 }])).toBeNull()
  })

  it('recovers a known slope and intercept', () => {
    const fit = linearFit([
      { x: 0, y: 10 },
      { x: 1, y: 8 },
      { x: 2, y: 6 },
    ])
    expect(fit?.slope).toBeCloseTo(-2, 6)
    expect(fit?.intercept).toBeCloseTo(10, 6)
  })
})

describe('buildRecompModel — guards', () => {
  it('is insufficient below four weigh-ins and never invents an ETA', () => {
    const m = buildRecompModel(series(82, 0.1, 3), 78, TODAY)
    expect(m.status).toBe('insufficient')
    expect(m.etaDays).toBeNull()
    expect(m.etaDateLabel).toBeNull()
    expect(m.regression).toBeNull()
  })

  it('reports no-target when target weight is missing, but still trends', () => {
    const m = buildRecompModel(series(82, 0.1, 10), null, TODAY)
    expect(m.status).toBe('no-target')
    expect(m.etaDays).toBeNull()
    expect(m.targetY).toBeNull()
    expect(m.regression).not.toBeNull() // trend line still drawn
    expect(m.thirtyDayDelta).toBeLessThan(0)
  })

  it('ignores weigh-ins older than the 30-day window', () => {
    const old: WeighInInput[] = [{ date: '2026-01-01', weight: 99 }]
    const m = buildRecompModel([...old, ...series(82, 0.1, 6)], 78, TODAY)
    expect(m.weighInCount).toBe(6)
    expect(m.currentWeight).toBeCloseTo(81.5, 1)
  })
})

describe('buildRecompModel — convergence', () => {
  it('projects an ETA when cutting toward a lower target', () => {
    // 82 → ~80.5 over 16 days at 0.1/day; target 78 still below → converging
    const m = buildRecompModel(series(82, 0.1, 16), 78, TODAY)
    expect(m.status).toBe('converging')
    expect(m.ratePerWeek).toBeLessThan(0)
    expect(m.etaDays).toBeGreaterThan(0)
    expect(m.etaDateLabel).toBeTruthy()
    expect(m.deltaToGo).toBeGreaterThan(0) // still above target
    // geometry sane
    for (const d of m.dots) {
      expect(d.x).toBeGreaterThanOrEqual(0)
      expect(d.x).toBeLessThanOrEqual(1)
      expect(d.y).toBeGreaterThanOrEqual(0)
      expect(d.y).toBeLessThanOrEqual(1)
    }
    expect(m.targetY).toBeGreaterThanOrEqual(0)
    expect(m.targetY).toBeLessThanOrEqual(1)
    expect(m.nowX).toBeGreaterThan(0)
    expect(m.nowX).toBeLessThanOrEqual(1)
    expect(m.projection).not.toBeNull()
  })

  it('flags diverging (gaining while target is below) with no ETA', () => {
    const m = buildRecompModel(series(78, -0.1, 16), 76, TODAY) // gaining toward 80+, target 76
    expect(m.status).toBe('diverging')
    expect(m.etaDays).toBeNull()
    expect(m.projection).toBeNull()
    expect(m.ratePerWeek).toBeGreaterThan(0)
  })

  it('reads a near-flat trend as holding', () => {
    const m = buildRecompModel(series(80, 0.001, 12), 78, TODAY)
    expect(m.status).toBe('flat')
    expect(m.etaDays).toBeNull()
  })

  it('treats being within the arrived band as flat', () => {
    const m = buildRecompModel(series(78.1, 0.01, 8), 78, TODAY) // ends ~78.03
    expect(m.status).toBe('flat')
  })

  it('supports bulking: gaining toward a higher target converges', () => {
    const m = buildRecompModel(series(70, -0.1, 16), 75, TODAY) // weight rising, target above
    expect(m.status).toBe('converging')
    expect(m.ratePerWeek).toBeGreaterThan(0)
    expect(m.etaDays).toBeGreaterThan(0)
  })
})

describe('girth helpers', () => {
  const recent = [
    { waist_cm: 84, arm_cm: 39 }, // newest
    { waist_cm: 85, arm_cm: 38.5 },
    { waist_cm: 86, arm_cm: 38 }, // oldest
  ]

  it('computes signed delta newest-minus-oldest', () => {
    expect(girthDelta(recent, 'waist_cm').delta).toBeCloseTo(-2, 6)
    expect(girthDelta(recent, 'arm_cm').delta).toBeCloseTo(1, 6)
  })

  it('returns null delta with a single reading', () => {
    expect(girthDelta([{ waist_cm: 84 }], 'waist_cm').delta).toBeNull()
  })

  it('encodes direction: waist down is good, arm up is good', () => {
    expect(girthStatus(-2, 'down')).toBe('good')
    expect(girthStatus(2, 'down')).toBe('bad')
    expect(girthStatus(1, 'up')).toBe('good')
    expect(girthStatus(0.05, 'up')).toBe('neutral')
  })
})
