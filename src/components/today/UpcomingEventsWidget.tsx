import { formatInTimeZone } from 'date-fns-tz';
import { WidgetCard, WidgetLink } from './WidgetCard';

type Event = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  kind: 'event' | 'appointment' | 'milestone';
  localDate: string;
};

export function UpcomingEventsWidget({
  todayEvents,
  tomorrowEvents,
  tz,
}: {
  todayEvents: Event[];
  tomorrowEvents: Event[];
  tz: string;
}) {
  return (
    <WidgetCard
      title="[ AGENDA ]"
      testid="upcoming-events-widget"
      right={<WidgetLink href="/plans">CALENDAR</WidgetLink>}
    >
      <div className="flex flex-col gap-5">
        <Section
          label="TODAY"
          events={todayEvents}
          tz={tz}
          emptyText="Nothing scheduled"
          testid="today-events"
        />
        <Section
          label="TOMORROW"
          events={tomorrowEvents}
          tz={tz}
          emptyText="Nothing scheduled"
          testid="tomorrow-events"
        />
      </div>
    </WidgetCard>
  );
}

function Section({
  label,
  events,
  tz,
  emptyText,
  testid,
}: {
  label: string;
  events: Event[];
  tz: string;
  emptyText: string;
  testid: string;
}) {
  return (
    <div data-testid={testid}>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        {label}
      </span>
      {events.length === 0 ? (
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
          {emptyText}
        </p>
      ) : (
        <ul className="mt-1">
          {events.map((e) => (
            <li
              key={e.id}
              data-testid={`upcoming-${e.id}`}
              className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
            >
              <div className="flex min-w-0 items-baseline gap-3">
                <span className="shrink-0 font-mono text-[11px] tabular-nums tracking-[0.04em] text-text-secondary">
                  {formatInTimeZone(e.starts_at, tz, 'HH:mm')}
                </span>
                <span className="truncate font-sans text-[14px] text-text-primary">
                  {e.title}
                </span>
              </div>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                {e.kind}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
