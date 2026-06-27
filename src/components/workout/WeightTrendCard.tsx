import { formatUTCDate } from '@/lib/utils/workout-metrics'
import { addDays } from '@/lib/utils/lift-metrics'

interface WeighPoint {
  date: string
  weight: number | null
}

interface Props {
  series: WeighPoint[] // any order; nulls allowed
  today: string
  days?: number
  targetWeight: number | null
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

function fmtAxis(iso: string): string {
  return formatUTCDate(iso, { day: '2-digit', month: 'short' }).toUpperCase()
}

export function WeightTrendCard({ series, today, days = 90, targetWeight }: Props) {
  const pts = series
    .filter((p): p is { date: string; weight: number } => p.weight != null)
    .map((p) => ({ date: p.date, weight: Number(p.weight) }))
    .sort((a, b) => a.date.localeCompare(b.date)) // oldest → newest

  const header = (
    <div className="mb-5 flex items-baseline justify-between gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
        [ WEIGHT · {days}D ]
      </span>
      {pts.length > 0 && (
        <span className="font-mono text-[13px] tabular-nums text-text-primary">
          {pts[pts.length - 1].weight.toFixed(1)}{' '}
          <span className="text-text-disabled">KG</span>
        </span>
      )}
    </div>
  )

  if (pts.length === 0) {
    return (
      <section className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6">
        {header}
        <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
          NO WEIGH-INS YET
        </p>
      </section>
    )
  }

  // x-axis spans [windowStart, today]; widen left if an older point slips in.
  const windowStart = addDays(today, -(days - 1))
  const spanStart = pts[0].date < windowStart ? pts[0].date : windowStart
  const spanDays = Math.max(1, dayDiff(spanStart, today))
  const xOf = (date: string) => (dayDiff(spanStart, date) / spanDays) * 100

  // y-axis spans the weight range (plus target), with padding so the line breathes.
  const weights = pts.map((p) => p.weight)
  const valuesForRange = targetWeight != null ? [...weights, targetWeight] : weights
  let lo = Math.min(...valuesForRange)
  let hi = Math.max(...valuesForRange)
  if (hi === lo) {
    hi = lo + 1
    lo = lo - 1
  }
  const pad = (hi - lo) * 0.12
  const yBot = lo - pad
  const yTop = hi + pad
  const yOf = (w: number) => 100 - ((w - yBot) / (yTop - yBot)) * 100

  const latest = pts[pts.length - 1]
  const earliest = pts[0]
  const netDelta = pts.length >= 2 ? latest.weight - earliest.weight : null

  // The single colour moment: the line encodes progress toward the target.
  let trendVar = 'var(--text-secondary)'
  let trendClass = 'text-text-secondary'
  if (targetWeight != null && pts.length >= 2) {
    const before = Math.abs(earliest.weight - targetWeight)
    const after = Math.abs(latest.weight - targetWeight)
    if (after < before) {
      trendVar = 'var(--success)'
      trendClass = 'text-success'
    } else if (after > before) {
      trendVar = 'var(--accent)'
      trendClass = 'text-accent'
    }
  }

  const linePoints = pts
    .map((p) => `${xOf(p.date).toFixed(2)},${yOf(p.weight).toFixed(2)}`)
    .join(' ')
  const targetY = targetWeight != null ? yOf(targetWeight) : null

  const deltaText =
    netDelta != null
      ? `${netDelta > 0 ? '▲ ' : netDelta < 0 ? '▼ ' : '= '}${Math.abs(netDelta).toFixed(1)} KG · ${days}D`
      : 'ONE ENTRY'

  return (
    <section className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6">
      {header}

      <div className="mb-4 flex items-baseline justify-between gap-3">
        <span className={`font-mono text-[11px] uppercase tracking-[0.08em] ${trendClass}`}>
          {deltaText}
        </span>
        {targetWeight != null && (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            TARGET {targetWeight.toFixed(1)}
          </span>
        )}
      </div>

      <div className="relative h-32 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {targetY != null && (
            <line
              x1="0"
              y1={targetY}
              x2="100"
              y2={targetY}
              stroke="var(--border-visible)"
              strokeWidth="1"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {pts.length >= 2 && (
            <polyline
              points={linePoints}
              fill="none"
              stroke={trendVar}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Round dots overlaid in HTML so they stay circular under the stretched SVG. */}
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1
          return (
            <div
              key={p.date}
              className="absolute"
              style={{
                left: `${xOf(p.date)}%`,
                top: `${yOf(p.weight)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={isLast ? 'h-2 w-2 rounded-full' : 'h-1 w-1 rounded-full bg-text-disabled'}
                style={isLast ? { backgroundColor: trendVar } : undefined}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.08em] text-text-disabled">
        <span>{fmtAxis(spanStart)}</span>
        <span>{fmtAxis(today)}</span>
      </div>
    </section>
  )
}
