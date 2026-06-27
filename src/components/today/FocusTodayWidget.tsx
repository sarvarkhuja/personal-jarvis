import { formatInTimeZone } from 'date-fns-tz';
import { WidgetCard, WidgetEmpty, WidgetLink } from './WidgetCard';

type Session = {
  id: string;
  started_at: string;
  ended_at: string | null;
  planned_minutes: number;
  completed: boolean;
  intent: string | null;
};

export function FocusTodayWidget({
  sessions,
  tz,
}: {
  sessions: Session[];
  tz: string;
}) {
  const totalMinutes = sessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.planned_minutes, 0);
  const last = sessions[0];

  return (
    <WidgetCard
      title="[ FOCUS ]"
      testid="focus-today-widget"
      right={<WidgetLink href="/focus">START</WidgetLink>}
    >
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono text-4xl tabular-nums tracking-tight text-text-primary"
          data-testid="focus-total-minutes"
        >
          {totalMinutes}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
          min today
        </span>
      </div>
      {last ? (
        <div
          className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3"
          data-testid="focus-last-session"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-sans text-[13px] text-text-primary">
              {last.intent ?? 'Focus session'}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
              {formatInTimeZone(last.started_at, tz, 'HH:mm')} ·{' '}
              {last.planned_minutes}m
            </span>
          </div>
          <span
            className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] ${
              last.completed ? 'text-success' : 'text-text-disabled'
            }`}
          >
            {last.completed ? 'completed' : 'ended early'}
          </span>
        </div>
      ) : (
        <WidgetEmpty>No sessions yet today</WidgetEmpty>
      )}
    </WidgetCard>
  );
}
