import type { LiftRow } from '@/lib/utils/lift-metrics'
import { RepSparkline } from './RepSparkline'

interface Props {
  rows: LiftRow[]
  weeks: number
}

export function ProgressionCard({ rows, weeks }: Props) {
  return (
    <section className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ PROGRESSION · {weeks} WK ]
        </span>
      </div>

      <div className="divide-y divide-border">
        {rows.map((row) => {
          const logged = row.history
          const latest = logged.length ? logged[logged.length - 1].weight : null
          const gain =
            logged.length >= 2 ? logged[logged.length - 1].reps - logged[0].reps : null
          return (
            <div
              key={row.def.key}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="w-28 shrink-0 truncate font-mono text-[11px] uppercase tracking-[0.08em] text-text-primary">
                {row.def.display}
              </span>
              <div className="flex flex-1 justify-center">
                <RepSparkline history={row.history} weeks={weeks} />
              </div>
              <div className="w-20 shrink-0 text-right">
                <p className="font-mono text-[13px] tabular-nums text-text-primary">
                  {latest != null ? latest : '—'}
                  <span className="text-text-disabled"> kg</span>
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                  {gain != null
                    ? `${gain > 0 ? '+' : ''}${gain} OVER ${logged.length} WK`
                    : 'NO DATA'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
