'use client';

import * as React from 'react';
import { logHabit } from '@/lib/actions/habits';

export function LogHabitButton({
  habitId,
  kind,
  alreadyLogged,
}: {
  habitId: string;
  kind: 'check' | 'counter' | 'timer';
  alreadyLogged: boolean;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (kind === 'timer') {
    return (
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        use timer
      </span>
    );
  }

  const onClick = async () => {
    setError(null);
    setPending(true);
    try {
      await logHabit({ habit_id: habitId, value: 1 });
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
        data-testid={`log-${habitId}`}
        className={`h-8 min-w-[2.5rem] rounded-full px-3.5 font-mono text-[12px] uppercase tracking-[0.06em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary ${
          alreadyLogged
            ? 'border border-border-visible text-text-secondary hover:border-text-primary hover:text-text-primary'
            : 'bg-text-display text-background hover:opacity-90'
        }`}
      >
        {pending ? '…' : kind === 'counter' ? '+1' : '✓'}
      </button>
    </div>
  );
}
