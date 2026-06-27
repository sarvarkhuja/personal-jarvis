import {
  WidgetCard,
  WidgetEmpty,
  WidgetLink,
} from '@/components/today/WidgetCard';
import type { PillWeekAdherence } from '@/lib/domain/home-overview';

/** Read-only pills glance: today taken X/Y + a 7-day adherence strip. */
export function PillsGlance({ adherence }: { adherence: PillWeekAdherence }) {
  const { takenToday, total, week } = adherence;
  const allDone = total > 0 && takenToday === total;

  return (
    <WidgetCard
      title="[ PILLS ]"
      right={<WidgetLink href="/pills">ALL</WidgetLink>}
      testid="home-pills"
    >
      {total === 0 ? (
        <WidgetEmpty>No medications</WidgetEmpty>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-doto text-4xl font-bold leading-none tracking-tight tabular-nums ${
                allDone ? 'text-success' : 'text-text-display'
              }`}
            >
              {takenToday}
            </span>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
              / {total} TAKEN TODAY
            </span>
          </div>
          <div className="mt-5 flex gap-[3px]">
            {week.map((d) => {
              const full = d.total > 0 && d.taken === d.total;
              const partial = d.taken > 0 && d.taken < d.total;
              const cls = full
                ? 'bg-success'
                : partial
                  ? 'bg-text-primary/50'
                  : 'border border-border-visible bg-transparent';
              return (
                <div
                  key={d.date}
                  title={d.date}
                  className={`h-5 flex-1 ${cls} ${d.isToday ? 'ring-1 ring-text-secondary' : ''}`}
                />
              );
            })}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
