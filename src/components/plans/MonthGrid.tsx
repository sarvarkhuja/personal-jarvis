'use client';

import * as React from 'react';
import { isInMonth, monthGrid } from '@/lib/domain/calendar';
import { AddEventSheet } from './AddEventSheet';

export type EventLite = {
  id: string;
  title: string;
  starts_at: string;
  localDate: string;
  kind: 'event' | 'appointment' | 'milestone';
};

export type HabitLite = {
  id: string;
  name: string;
  color: string | null;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthGrid({
  anchor,
  events,
  today,
  goalOptions,
  habits,
  habitLogsByDate,
}: {
  anchor: string;
  events: EventLite[];
  today: string;
  goalOptions: { id: string; label: string }[];
  habits: HabitLite[];
  habitLogsByDate: Map<string, string[]>;
}) {
  const grid = React.useMemo(() => monthGrid(anchor), [anchor]);
  const eventsByDate = React.useMemo(() => {
    const m = new Map<string, EventLite[]>();
    for (const e of events) {
      if (!m.has(e.localDate)) m.set(e.localDate, []);
      m.get(e.localDate)!.push(e);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    }
    return m;
  }, [events]);
  const habitsById = React.useMemo(
    () => new Map(habits.map((h) => [h.id, h])),
    [habits],
  );

  const [selected, setSelected] = React.useState(today);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-px rounded-md border bg-border text-xs">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-background p-2 text-center font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {grid.flat().map((date) => {
          const inMonth = isInMonth(date, anchor);
          const evs = eventsByDate.get(date) ?? [];
          const loggedIds = habitLogsByDate.get(date) ?? [];
          const loggedHabits = loggedIds
            .map((id) => habitsById.get(id))
            .filter((h): h is HabitLite => Boolean(h));
          const isToday = date === today;
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(date)}
              data-testid={`day-${date}`}
              className={[
                'flex h-24 flex-col items-stretch gap-1 bg-background p-1.5 text-left transition',
                inMonth ? '' : 'opacity-40',
                isSelected ? 'ring-2 ring-primary ring-inset' : '',
              ].join(' ')}
            >
              <span
                className={
                  isToday
                    ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground'
                    : 'text-[11px] font-medium text-foreground'
                }
              >
                {Number(date.slice(8, 10))}
              </span>
              <ul className="flex flex-col gap-0.5 overflow-hidden">
                {evs.slice(0, 2).map((e) => (
                  <li
                    key={e.id}
                    className="truncate rounded-sm border border-primary/30 bg-primary/5 px-1 text-[10px]"
                    data-testid={`cal-event-${e.id}`}
                    title={e.title}
                  >
                    {e.title}
                  </li>
                ))}
                {evs.length > 2 && (
                  <li className="text-[10px] text-muted-foreground">
                    +{evs.length - 2} more
                  </li>
                )}
              </ul>
              {loggedHabits.length > 0 && (
                <div
                  className="mt-auto flex flex-wrap items-center gap-0.5"
                  data-testid={`cal-habits-${date}`}
                >
                  {loggedHabits.slice(0, 4).map((h) => (
                    <span
                      key={h.id}
                      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500/10 px-1 text-[9px] leading-none text-emerald-700 dark:text-emerald-400"
                      title={`${h.name} ✓`}
                      data-testid={`cal-habit-${date}-${h.id}`}
                    >
                      ✓
                    </span>
                  ))}
                  {loggedHabits.length > 4 && (
                    <span className="text-[9px] text-muted-foreground">
                      +{loggedHabits.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Selected: {selected}</span>
          <span className="text-xs text-muted-foreground">
            {(eventsByDate.get(selected) ?? []).length} event(s) ·{' '}
            {(habitLogsByDate.get(selected) ?? []).length} habit(s) logged
          </span>
        </div>
        <AddEventSheet
          goalOptions={goalOptions}
          defaultDate={selected}
          triggerLabel={`+ event on ${selected}`}
        />
      </div>
    </div>
  );
}
