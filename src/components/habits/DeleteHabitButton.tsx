'use client';

import * as React from 'react';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteHabit } from '@/lib/actions/habits';

type Props = {
  habitId: string;
  habitName: string;
};

export function DeleteHabitButton({ habitId, habitName }: Props) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    if (pending) return;
    if (!window.confirm(`Delete "${habitName}"? This also removes its logs.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteHabit({ id: habitId });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete habit');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        aria-label={`Delete ${habitName}`}
        data-testid={`delete-habit-${habitId}`}
        disabled={pending}
        onClick={handleClick}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
