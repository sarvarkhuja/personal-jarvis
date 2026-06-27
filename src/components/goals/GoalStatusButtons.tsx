'use client';

import * as React from 'react';
import { setGoalStatus, deleteGoal } from '@/lib/actions/goals';

type Status = 'active' | 'done' | 'abandoned' | 'completed' | 'paused';

const BTN_BASE =
  'font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled transition-colors duration-200 ease-out disabled:opacity-40 motion-reduce:transition-none';

// Literal hover variants — Tailwind's scanner only generates classes it sees
// as whole strings, so these can't be assembled from a prop at runtime.
const HOVER = {
  primary: 'hover:text-text-primary',
  success: 'hover:text-success',
  accent: 'hover:text-accent',
} as const;

function Btn({
  children,
  hover = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  hover?: keyof typeof HOVER;
}) {
  return (
    <button type="button" {...props} className={`${BTN_BASE} ${HOVER[hover]}`}>
      {children}
    </button>
  );
}

export function GoalStatusButtons({
  goalId,
  goalTitle,
  status,
}: {
  goalId: string;
  goalTitle: string;
  status: Status;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function go(next: Status) {
    setError(null);
    startTransition(async () => {
      try {
        await setGoalStatus({ id: goalId, status: next });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  function remove() {
    if (pending) return;
    if (!window.confirm(`Delete goal "${goalTitle}"? Sub-goals will be unlinked.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteGoal({ id: goalId });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  const isActive = status === 'active';
  const isDone = status === 'done' || status === 'completed';

  return (
    <div className="flex shrink-0 items-center gap-3">
      {error && (
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
          [ERR]
        </span>
      )}
      {isActive && (
        <>
          <Btn
            hover="success"
            aria-label={`Mark ${goalTitle} done`}
            onClick={() => go('done')}
            disabled={pending}
            data-testid={`goal-done-${goalId}`}
          >
            [ DONE ]
          </Btn>
          <Btn
            aria-label={`Abandon ${goalTitle}`}
            onClick={() => go('abandoned')}
            disabled={pending}
            data-testid={`goal-abandon-${goalId}`}
          >
            [ DROP ]
          </Btn>
        </>
      )}
      {(isDone || status === 'abandoned' || status === 'paused') && (
        <Btn
          aria-label={`Reactivate ${goalTitle}`}
          onClick={() => go('active')}
          disabled={pending}
          data-testid={`goal-reactivate-${goalId}`}
        >
          [ REOPEN ]
        </Btn>
      )}
      <Btn
        hover="accent"
        aria-label={`Delete ${goalTitle}`}
        onClick={remove}
        disabled={pending}
        data-testid={`goal-delete-${goalId}`}
      >
        [ ✕ ]
      </Btn>
    </div>
  );
}
