'use client';

import { ALL_DAYS } from '@/lib/domain/habit-frequency';
import { cn } from '@/lib/utils';

const DAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

export function DayOfWeekPicker({
  value,
  onChange,
  id,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  id?: string;
}) {
  const selected = new Set(value);

  function toggle(day: number) {
    const next = new Set(selected);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    // Re-emit in canonical Mon→Sun order.
    onChange(ALL_DAYS.filter((d) => next.has(d)));
  }

  return (
    <div
      id={id}
      role="group"
      aria-label="Days of week"
      data-testid="habit-frequency"
      className="flex flex-wrap gap-1.5"
    >
      {ALL_DAYS.map((day) => {
        const isOn = selected.has(day);
        return (
          <button
            key={day}
            type="button"
            data-testid={`habit-day-${day}`}
            aria-pressed={isOn}
            onClick={() => toggle(day)}
            className={cn(
              'h-9 w-11 rounded-md border text-xs font-medium transition-colors',
              isOn
                ? 'border-foreground bg-foreground text-background'
                : 'border-input bg-background text-foreground hover:bg-muted',
            )}
          >
            {DAY_LABELS[day]}
          </button>
        );
      })}
    </div>
  );
}
