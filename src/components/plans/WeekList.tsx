import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteEventButton } from './DeleteEventButton';
import { formatInTimeZone } from 'date-fns-tz';

export type EventListItem = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  kind: 'event' | 'appointment' | 'milestone';
};

export type HabitDayItem = {
  id: string;
  name: string;
  emoji: string | null;
  logged: boolean;
};

export type DayBucket = {
  date: string; // YYYY-MM-DD in user TZ
  label: string; // "Today", "Tomorrow", "Wed 29 Apr"
  events: EventListItem[];
  habits: HabitDayItem[];
};

export function WeekList({
  days,
  tz,
}: {
  days: DayBucket[];
  tz: string;
}) {
  const isEmpty = days.every(
    (d) => d.events.length === 0 && d.habits.length === 0,
  );

  if (isEmpty) {
    return (
      <Card
        data-testid="week-list-empty"
        className="border-dashed p-6 text-center text-sm text-muted-foreground"
      >
        No upcoming events or habits.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="week-list">
      {days.map((d) => {
        if (d.events.length === 0 && d.habits.length === 0) return null;
        const doneCount = d.habits.filter((h) => h.logged).length;
        return (
          <Card
            key={d.date}
            className="flex flex-col gap-2 p-3"
            data-testid={`week-day-${d.date}`}
          >
            <header className="flex items-center justify-between">
              <span className="text-sm font-medium">{d.label}</span>
              {d.habits.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {doneCount}/{d.habits.length} habits
                </Badge>
              )}
            </header>

            {d.events.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {d.events.map((e) => (
                  <li
                    key={e.id}
                    data-testid={`event-row-${e.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{e.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatInTimeZone(e.starts_at, tz, 'HH:mm')}
                        {e.ends_at &&
                          ` – ${formatInTimeZone(e.ends_at, tz, 'HH:mm')}`}
                      </span>
                      {e.description && (
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {e.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {e.kind}
                      </Badge>
                      <DeleteEventButton eventId={e.id} eventTitle={e.title} />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {d.habits.length > 0 && (
              <ul
                className="flex flex-wrap gap-1.5"
                data-testid={`week-habits-${d.date}`}
              >
                {d.habits.map((h) => (
                  <li
                    key={h.id}
                    data-testid={`week-habit-${d.date}-${h.id}`}
                    className={[
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                      h.logged
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'border-muted-foreground/30 text-muted-foreground',
                    ].join(' ')}
                    title={h.logged ? `${h.name} — done` : `${h.name} — due`}
                  >
                    <span aria-hidden>{h.emoji ?? (h.logged ? '✓' : '○')}</span>
                    <span>{h.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
