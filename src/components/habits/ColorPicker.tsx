'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { HABIT_COLORS, habitColor } from '@/lib/constants/habit-colors';
import { cn } from '@/lib/utils';

export function ColorPicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (token: string) => void;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const current = habitColor(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            data-testid="habit-color"
            className="h-9 w-full justify-start gap-2 px-2 font-normal"
          >
            <span
              className={cn(
                'size-4 rounded-full border border-border',
                current.swatch,
              )}
            />
            <span className="text-sm">{current.label}</span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto">
        <div
          role="listbox"
          aria-label="Habit color"
          className="grid grid-cols-6 gap-1.5"
        >
          {HABIT_COLORS.map((color) => {
            const isSelected = color.token === value;
            return (
              <button
                key={color.token}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-label={color.label}
                title={color.label}
                data-testid={`habit-color-${color.token}`}
                onClick={() => {
                  onChange(color.token);
                  setOpen(false);
                }}
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border border-border transition-transform hover:scale-110',
                  color.swatch,
                  isSelected &&
                    'ring-2 ring-foreground ring-offset-2 ring-offset-popover',
                )}
              >
                {isSelected && <Check className="size-4 text-white" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
