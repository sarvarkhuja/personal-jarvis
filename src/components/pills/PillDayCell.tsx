'use client';

import * as React from 'react';
import { toggleMedicationCompletion } from '@/lib/actions/medications';

export function PillDayCell({
  medicationId,
  date,
  checked,
}: {
  medicationId: string;
  date: string;
  checked: boolean;
}) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    if (pending) return;
    startTransition(async () => {
      try {
        await toggleMedicationCompletion({ medication_id: medicationId, date });
      } catch {
        // revalidatePath('/pills') restores the true state on refresh.
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={checked}
      aria-label={`${checked ? 'Unmark' : 'Mark'} ${date}`}
      data-testid={`cell-${medicationId}-${date}`}
      className={`h-9 w-9 shrink-0 rounded-md border text-[11px] transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary ${
        checked
          ? 'border-transparent bg-text-display text-background'
          : 'border-border-visible text-text-disabled hover:border-text-primary'
      }`}
    >
      {checked ? '✓' : ''}
    </button>
  );
}
