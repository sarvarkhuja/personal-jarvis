import {
  WidgetCard,
  WidgetLink,
} from '@/components/today/WidgetCard';
import type { SalahDaySummary } from '@/lib/domain/salah';

/** Read-only salah glance: prayed X/5 today + next prayer + streak/on-time%. */
export function SalahGlance({ summary }: { summary: SalahDaySummary }) {
  const { prayedCount, nextLabel, nextAt, streakCurrent, onTimeRate7d } = summary;
  const allDone = prayedCount === 5;

  return (
    <WidgetCard
      title="[ SALAH · TODAY ]"
      right={<WidgetLink href="/salah">SALAH</WidgetLink>}
      testid="home-salah"
    >
      <div className="flex items-baseline gap-2">
        <span
          className={`font-doto text-4xl font-bold leading-none tracking-tight tabular-nums ${
            allDone ? 'text-success' : 'text-text-display'
          }`}
        >
          {prayedCount}
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
          / 5 PRAYED
        </span>
      </div>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
        {nextLabel ? `NEXT ${nextLabel.toUpperCase()} ${nextAt}` : 'ALL DONE'}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        {streakCurrent}D STREAK · {Math.round(onTimeRate7d * 100)}% ON-TIME
      </p>
    </WidgetCard>
  );
}
