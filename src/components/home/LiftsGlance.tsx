import { WidgetCard, WidgetLink } from '@/components/today/WidgetCard';
import type { LiftRow } from '@/lib/utils/lift-metrics';

/** Read-only big-5 glance: lifts logged this week (X/5) + per-lift rep bars and weekly trend. */
export function LiftsGlance({
  rows,
  loggedCount,
}: {
  rows: LiftRow[];
  loggedCount: number;
}) {
  const total = rows.length;
  const allDone = total > 0 && loggedCount === total;
  const maxReps = Math.max(1, ...rows.map((r) => r.current?.reps ?? 0));

  return (
    <WidgetCard
      title="[ LIFTS · THIS WEEK ]"
      right={<WidgetLink href="/workout">GYM</WidgetLink>}
      testid="home-lifts"
    >
      <div className="flex items-baseline gap-2">
        <span
          className={`font-doto text-4xl font-bold leading-none tracking-tight tabular-nums ${
            allDone ? 'text-success' : 'text-text-display'
          }`}
        >
          {loggedCount}
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
          / {total} LOGGED
        </span>
      </div>
      <div className="mt-5 space-y-2">
        {rows.map((row) => {
          const logged = row.current != null;
          const reps = row.current?.reps ?? 0;
          const width = logged ? Math.max(6, Math.round((reps / maxReps) * 100)) : 0;
          const weight = row.current?.weight ?? null;
          const weightText =
            logged && !row.def.bodyweight && weight != null ? `${weight}kg` : null;
          const dir = row.trend?.dir ?? null;
          const delta = row.trend?.delta ?? 0;
          const trendText =
            dir === 'up' ? `↑ +${delta}` : dir === 'down' ? `↓ −${Math.abs(delta)}` : '·';
          const trendClass =
            dir === 'up'
              ? 'text-success'
              : dir === 'down'
                ? 'text-accent'
                : 'text-text-disabled';
          return (
            <div key={row.def.key} className="flex items-center gap-3">
              <span
                className={`w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] ${
                  logged ? 'text-text-secondary' : 'text-text-disabled'
                }`}
              >
                {row.def.display}
              </span>
              <div className="h-2 flex-1">
                {logged ? (
                  <div className="h-full bg-text-primary" style={{ width: `${width}%` }} />
                ) : (
                  <span className="font-mono text-[10px] leading-none text-text-disabled">
                    ──
                  </span>
                )}
              </div>
              <span
                className={`w-14 shrink-0 text-right font-mono text-[10px] tabular-nums ${
                  weightText ? 'text-text-secondary' : 'text-text-disabled'
                }`}
              >
                {weightText ?? (logged ? '—' : '')}
              </span>
              <span
                className={`w-10 shrink-0 text-right font-mono text-[10px] tabular-nums ${trendClass}`}
              >
                {trendText}
              </span>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
