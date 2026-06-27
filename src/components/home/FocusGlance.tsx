import {
  WidgetCard,
  WidgetEmpty,
  WidgetLink,
} from '@/components/today/WidgetCard';
import { formatMinutes } from '@/lib/domain/home-overview';
import type { FocusMetrics } from '@/lib/utils/focus-metrics';

/** Read-only deep-work glance: this-week minutes, Mon–Sun bars, current streak. */
export function FocusGlance({
  week,
  streakCount,
}: {
  week: FocusMetrics['week'];
  streakCount: number;
}) {
  const max = Math.max(...week.bars.map((b) => b.min), 1);

  return (
    <WidgetCard
      title="[ DEEP WORK · THIS WEEK ]"
      right={
        <>
          {streakCount > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
              {streakCount}D STREAK
            </span>
          )}
          <WidgetLink href="/focus">FOCUS</WidgetLink>
        </>
      }
      testid="home-focus"
    >
      {week.totalMin === 0 ? (
        <WidgetEmpty>No focus sessions this week</WidgetEmpty>
      ) : (
        <>
          <span className="font-mono text-4xl leading-none tabular-nums text-text-primary">
            {formatMinutes(week.totalMin)}
          </span>
          <div className="mt-5 flex h-12 items-end gap-1">
            {week.bars.map((b) => (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full ${b.isToday ? 'bg-text-primary' : 'bg-border-visible'}`}
                  style={{ height: `${Math.max(4, Math.round((b.min / max) * 100))}%` }}
                />
                <span
                  className={`font-mono text-[9px] uppercase ${
                    b.isToday ? 'text-text-primary' : 'text-text-disabled'
                  }`}
                >
                  {b.label[0]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
