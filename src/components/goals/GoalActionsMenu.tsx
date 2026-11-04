'use client';

import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { deleteGoal, setGoalStatus } from '@/lib/actions/goals';

type Status = 'active' | 'done' | 'abandoned' | 'completed' | 'paused';

type Action =
  | { key: string; label: string; kind: 'status'; next: Status }
  | { key: string; label: string; kind: 'subgoal' }
  | { key: string; label: string; kind: 'delete' };

const CAPTION = 'font-mono text-[11px] tracking-[0.08em]';

function actionsFor(status: Status, canAddSubGoal: boolean): Action[] {
  const complete: Action = { key: 'complete', label: 'Complete', kind: 'status', next: 'done' };
  const abandon: Action = { key: 'abandon', label: 'Abandon', kind: 'status', next: 'abandoned' };
  const resume: Action = { key: 'resume', label: 'Resume', kind: 'status', next: 'active' };
  const remove: Action = { key: 'delete', label: 'Delete', kind: 'delete' };

  if (status === 'active') {
    return [
      complete,
      { key: 'pause', label: 'Pause', kind: 'status', next: 'paused' },
      abandon,
      ...(canAddSubGoal
        ? [{ key: 'subgoal', label: 'Add sub-goal', kind: 'subgoal' } as const]
        : []),
      remove,
    ];
  }
  if (status === 'paused') return [resume, complete, abandon, remove];
  return [resume, remove];
}

export function GoalActionsMenu({
  goalId,
  goalTitle,
  status,
  onAddSubGoal,
}: {
  goalId: string;
  goalTitle: string;
  status: Status;
  onAddSubGoal?: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState(false);

  function run(fn: () => Promise<unknown>) {
    setError(false);
    startTransition(async () => {
      try {
        await fn();
      } catch {
        setError(true);
      }
    });
  }

  function handle(action: Action) {
    if (pending) return;
    if (action.kind === 'subgoal') {
      onAddSubGoal?.();
      return;
    }
    if (action.kind === 'delete') {
      if (
        !window.confirm(
          `Delete "${goalTitle}"? This also deletes its habits and their history.`,
        )
      ) {
        return;
      }
      run(() => deleteGoal({ id: goalId }));
      return;
    }
    const next = action.next;
    run(() => setGoalStatus({ id: goalId, status: next }));
  }

  const items = actionsFor(status, Boolean(onAddSubGoal));

  return (
    <div className="flex shrink-0 items-center gap-2">
      {error && (
        <span
          className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent"
          role="status"
        >
          [ERR]
        </span>
      )}
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Goal actions for ${goalTitle}`}
          aria-haspopup="menu"
          disabled={pending}
          data-testid={`goal-actions-${goalId}`}
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm px-1 font-mono text-[14px] leading-none text-text-disabled transition-colors duration-200 ease-out hover:text-text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary disabled:opacity-40 data-[popup-open]:text-text-primary motion-reduce:transition-none"
        >
          <span aria-hidden="true">⋯</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={4} className="isolate z-50">
            <Menu.Popup className="min-w-[10rem] rounded-md border border-border-visible bg-surface py-1 outline-none transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none">
              {items.map((action) => (
                <Menu.Item
                  key={action.key}
                  onClick={() => handle(action)}
                  className={`${CAPTION} flex min-h-8 cursor-default select-none items-center px-3 outline-none transition-colors duration-150 ease-out motion-reduce:transition-none data-[highlighted]:bg-surface-raised ${
                    action.kind === 'delete'
                      ? 'text-text-secondary data-[highlighted]:text-accent'
                      : 'text-text-secondary data-[highlighted]:text-text-primary'
                  }`}
                >
                  {action.label}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
