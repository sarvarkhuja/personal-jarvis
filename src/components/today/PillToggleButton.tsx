'use client';

import * as React from 'react';
import { toggleMedicationCompletion } from '@/lib/actions/medications';

export function PillToggleButton({
  medicationId,
  date,
  checked,
}: {
  medicationId: string;
  date: string;
  checked: boolean;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setPending(true);
    try {
      await toggleMedicationCompletion({ medication_id: medicationId, date });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      {error && (
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        data-testid={`toggle-pill-${medicationId}`}
        className={`h-8 min-w-[2.5rem] rounded-full px-3.5 font-mono text-[12px] uppercase tracking-[0.06em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary ${
          checked
            ? 'border border-border-visible text-text-secondary hover:border-text-primary hover:text-text-primary'
            : 'bg-text-display text-background hover:opacity-90'
        }`}
      >
        {pending ? '…' : '✓'}
      </button>
    </div>
  );
}
