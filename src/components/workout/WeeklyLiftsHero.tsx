import type { LiftRow } from '@/lib/utils/lift-metrics'
import { RepSparkline } from './RepSparkline'
import { LiftLogSheet } from './LiftLogSheet'

interface Props {
  rows: LiftRow[]
  weekNumber: number
  weekRange: string // e.g. "JUN 23 – JUN 29"
  weekStart: string // current Monday (YYYY-MM-DD)
  loggedCount: number
}

function weightContext(
  current: LiftRow['current'],
  previous: LiftRow['previous'],
  bodyweight: boolean,
): string {
  const w = current?.weight ?? previous?.weight ?? null
  if (bodyweight) return w != null ? `BW+${w}` : 'BW'
  return w != null ? `${w} KG` : '—'
}

export function WeeklyLiftsHero({
  rows,
  weekNumber,
  weekRange,
  weekStart,
  loggedCount,
}: Props) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6 md:p-8">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ THIS WEEK · W{weekNumber} ]
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {weekRange} · <span className="text-text-primary">{loggedCount}</span>/5 LOGGED
        </span>
      </div>

      <div>
        {rows.map((row) => (
          <div
            key={row.def.key}
            className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-0"
          >
            <div className="w-32 shrink-0">
              <p className="truncate font-mono text-[12px] uppercase tracking-[0.08em] text-text-primary">
                {row.def.display}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                {weightContext(row.current, row.previous, row.def.bodyweight)}
              </p>
            </div>

            <div className="hidden flex-1 justify-center sm:flex">
              <RepSparkline history={row.history} />
            </div>

            <div className="w-20 shrink-0 text-right">
              {row.current?.weight && (
                <p className="font-doto text-4xl leading-none tracking-tight text-text-display">
                  {row.current.reps}
                </p>
              )}
              {row.current?.weight && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                  {weightContext(row.current, row.previous, row.def.bodyweight)}
                </p>
              )}

            </div>

            <div className="w-16 shrink-0 text-right">
              <LiftLogSheet
                exercise={row.def.key}
                display={row.def.display}
                bodyweight={row.def.bodyweight}
                weekStart={weekStart}
                current={row.current}
                previous={row.previous}
                triggerLabel={row.current ? 'edit' : 'log'}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Trend({
  trend,
  weightChanged,
}: {
  trend: LiftRow['trend']
  weightChanged: boolean
}) {
  if (!trend) {
    return (
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        —
      </p>
    )
  }
  const glyph = trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '='
  const color =
    trend.dir === 'up'
      ? 'text-success'
      : trend.dir === 'down'
        ? 'text-accent'
        : 'text-text-secondary'
  const sign = trend.delta > 0 ? '+' : ''
  return (
    <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.08em] ${color}`}>
      {glyph} {trend.dir === 'flat' ? '' : `${sign}${trend.delta}`}
      {weightChanged && <span className="ml-1 text-text-disabled">WT</span>}
    </p>
  )
}
