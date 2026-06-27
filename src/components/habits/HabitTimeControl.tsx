'use client';

import * as React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateHabit } from '@/lib/actions/habits';
import { hhmm } from '@/lib/domain/day-part';

/**
 * Inline set / change / clear of a timer habit's scheduled time. Mirrors the
 * ColorPicker popover pattern. Renders only on timer cards.
 */
export function HabitTimeControl({
  habitId,
  scheduledTime,
}: {
  habitId: string;
  scheduledTime: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [time, setTime] = React.useState(hhmm(scheduledTime));
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // Reset the editable value to the current time whenever the popover opens.
  // Done in the open handler (not a useEffect): calling a state setter inside
  // useEffect trips the react-hooks/set-state-in-effect lint rule.
  function handleOpenChange(next: boolean) {
    if (next) {
      setTime(hhmm(scheduledTime));
      setError(null);
    }
    setOpen(next);
  }

  function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        await updateHabit({ id: habitId, scheduled_time: next });
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update time');
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            data-testid={`habit-time-${habitId}`}
            className="h-auto px-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled hover:text-text-primary"
          >
            ▶ {scheduledTime ? hhmm(scheduledTime) : 'Set time'}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col gap-2">
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            data-testid={`habit-time-input-${habitId}`}
            className="h-9"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              disabled={pending || !time}
              onClick={() => save(time)}
              data-testid={`habit-time-save-${habitId}`}
              className="h-8 px-3 text-xs"
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || !scheduledTime}
              onClick={() => save(null)}
              data-testid={`habit-time-clear-${habitId}`}
              className="h-8 px-3 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
