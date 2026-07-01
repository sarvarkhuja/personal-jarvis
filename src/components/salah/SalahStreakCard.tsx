import { WidgetCard } from '@/components/today/WidgetCard';

export function SalahStreakCard({
  streakCurrent,
  streakLongest,
  onTimeRate30d,
}: {
  streakCurrent: number;
  streakLongest: number;
  onTimeRate30d: number;
}) {
  return (
    <WidgetCard title="[ SALAH · STREAK ]" testid="salah-streak">
      <div className="flex items-baseline gap-2">
        <span className="font-doto text-4xl font-bold leading-none tracking-tight tabular-nums text-text-display">
          {streakCurrent}
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
          DAY STREAK
        </span>
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        LONGEST {streakLongest}D · {Math.round(onTimeRate30d * 100)}% ON-TIME (30D)
      </p>
    </WidgetCard>
  );
}
