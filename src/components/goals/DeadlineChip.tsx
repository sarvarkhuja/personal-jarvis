'use client';

import * as React from 'react';
import { updateGoal } from '@/lib/actions/goals';

const CAPTION =
  'font-mono text-[10px] uppercase tracking-[0.08em]';
const FOCUS = 'focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary';

// A date is committable only when it's a complete YYYY-MM-DD with a plausible
// year — native date inputs emit values like `0002-12-31` while the year is
// still being typed, which must not be saved.
function isCommittable(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < 1900 || year > 2999) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function DeadlineChip({
  goalId,
  targetDate,
  today,
}: {
  goalId: string;
  targetDate: string | null;
  /** User-local today (YYYY-MM-DD). Accepted for parity with the card; the
   *  countdown itself is rendered by the parent. */
  today: string;
}) {
  void today;
  const [pending, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState(false);
  const [shown, setShown] = React.useState<string | null>(targetDate);
  const [error, setError] = React.useState(false);
  const chipRef = React.useRef<HTMLButtonElement>(null);
  const restoreFocus = React.useRef(false);

  // Follow server updates (revalidation after a save, or edits elsewhere).
  const [prevTarget, setPrevTarget] = React.useState(targetDate);
  if (prevTarget !== targetDate) {
    setPrevTarget(targetDate);
    setShown(targetDate);
  }

  React.useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      chipRef.current?.focus();
    }
  }, [editing]);

  function close(focusChip: boolean) {
    restoreFocus.current = focusChip;
    setEditing(false);
  }

  function commit(next: string | null) {
    const previous = shown;
    close(true);
    if (next === previous) return;
    setError(false);
    setShown(next);
    startTransition(async () => {
      try {
        await updateGoal({ id: goalId, target_date: next });
      } catch {
        setShown(previous);
        setError(true);
      }
    });
  }

  const errBadge = error && (
    <span className={`${CAPTION} text-accent`} role="status">
      [ERR]
    </span>
  );

  if (editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <input
          type="date"
          autoFocus
          aria-label="Deadline date"
          defaultValue={shown ?? ''}
          onChange={(e) => {
            const value = e.currentTarget.value;
            if (isCommittable(value) && value !== shown) commit(value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              close(true);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const value = e.currentTarget.value;
              if (isCommittable(value)) commit(value);
              else close(true);
            }
          }}
          onBlur={(e) => {
            // Leaving for the CLEAR button must not cancel the edit.
            if (e.relatedTarget instanceof HTMLElement && e.relatedTarget.dataset.deadlineClear) {
              return;
            }
            const value = e.currentTarget.value;
            if (isCommittable(value) && value !== shown) commit(value);
            else close(false);
          }}
          className={`${CAPTION} ${FOCUS} min-h-6 rounded-sm border border-dashed border-border-visible bg-surface px-2 py-0.5 text-text-primary [color-scheme:light] dark:[color-scheme:dark] transition-colors duration-200 ease-out motion-reduce:transition-none disabled:opacity-40`}
        />
        {shown && (
          <button
            type="button"
            data-deadline-clear="true"
            aria-label="Clear deadline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => commit(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                close(true);
              }
            }}
            onBlur={(e) => {
              if (!(e.relatedTarget instanceof HTMLInputElement)) close(false);
            }}
            className={`${CAPTION} ${FOCUS} min-h-6 px-1 text-text-disabled transition-colors duration-200 ease-out hover:text-accent motion-reduce:transition-none`}
          >
            CLEAR
          </button>
        )}
      </span>
    );
  }

  const human = shown ? formatDate(shown) : null;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        ref={chipRef}
        type="button"
        aria-label={human ? `Change deadline for this goal, currently ${human}` : 'Set a deadline'}
        aria-disabled={pending || undefined}
        onClick={() => {
          if (pending) return;
          setError(false);
          setEditing(true);
        }}
        className={`${CAPTION} ${FOCUS} inline-flex min-h-6 items-center rounded-sm border border-dashed border-border-visible px-2 py-0.5 text-text-secondary transition-colors duration-200 ease-out hover:border-text-secondary hover:text-text-primary motion-reduce:transition-none aria-disabled:opacity-40`}
      >
        {human ? `DUE ${human.toUpperCase()} ✎` : 'NO DEADLINE ✎'}
      </button>
      {errBadge}
    </span>
  );
}
