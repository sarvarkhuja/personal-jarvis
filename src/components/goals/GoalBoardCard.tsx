'use client';

import * as React from 'react';
import { countdownFor, TONE_TEXT } from '@/lib/domain/goal-display';
import type { BoardCard } from '@/lib/domain/goal-board';
import { HabitRow, type HabitRowData } from '@/components/habits/HabitRow';
import { AddHabitSheet } from '@/components/habits/AddHabitSheet';
import { AddGoalSheet } from './AddGoalSheet';
import { DeadlineChip } from './DeadlineChip';
import { GoalActionsMenu } from './GoalActionsMenu';

type Option = { id: string; label: string };

const STATUS_LABEL = {
  active: '',
  paused: 'PAUSED',
  done: 'DONE',
  abandoned: 'ABANDONED',
  unlinked: 'NO GOAL',
} as const;

/**
 * One goal and the habits that serve it. The goal half is read-mostly: title,
 * countdown, and a deadline chip that edits in place. Everything else about the
 * goal lives behind the ⋯ menu. The habit half is fully interactive.
 */
export function GoalBoardCard({
  card,
  today,
  goalOptions,
}: {
  card: BoardCard<HabitRowData>;
  today: string;
  goalOptions: Option[];
}) {
  const [subGoalOpen, setSubGoalOpen] = React.useState(false);
  const { goal, habits, muted, status, parentTitle } = card;

  const due = habits.filter((h) => h.dueToday);
  const doneCount = due.filter((h) => h.doneToday).length;
  const ratio = due.length === 0 ? 0 : doneCount / due.length;
  const allDone = due.length > 0 && doneCount === due.length;

  const cd = goal ? countdownFor(goal.target_date, today, goal.status) : null;
  const testid = goal ? `goal-card-${goal.id}` : 'goal-card-unlinked';

  return (
    <section
      data-testid={testid}
      aria-label={goal ? goal.title : 'Habits without a goal'}
      className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6"
    >
      {/* goal header — read-mostly */}
      <header className={muted ? 'opacity-60' : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              data-testid={goal ? `goal-title-${goal.id}` : undefined}
              className="font-sans text-[17px] font-medium leading-snug text-text-display"
            >
              {goal ? goal.title : 'Habits without a goal'}
            </h2>
            {parentTitle && (
              <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                ↳ {parentTitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span
              className={`font-mono text-[11px] uppercase tracking-[0.08em] ${
                muted ? 'text-text-disabled' : cd ? TONE_TEXT[cd.tone] : ''
              }`}
            >
              {/* NO DEADLINE is already said by the chip below. */}
              {muted ? STATUS_LABEL[status] : cd && cd.days != null ? cd.label : ''}
            </span>
            {goal && (
              <GoalActionsMenu
                goalId={goal.id}
                goalTitle={goal.title}
                status={goal.status}
                onAddSubGoal={() => setSubGoalOpen(true)}
              />
            )}
          </div>
        </div>
        {goal && (
          <div className="mt-3">
            <DeadlineChip goalId={goal.id} targetDate={goal.target_date} today={today} />
          </div>
        )}
      </header>

      {/* today's progress for this goal's habits */}
      {habits.length > 0 && due.length > 0 && (
        <div className="mt-5">
          <div className="h-[3px] overflow-hidden rounded-full bg-border" aria-hidden>
            <div
              className={`h-full transition-[width] duration-300 ease-out motion-reduce:transition-none ${
                allDone ? 'bg-success' : 'bg-text-primary'
              }`}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
          <p
            className={`mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] ${
              allDone ? 'text-success' : 'text-text-disabled'
            }`}
          >
            {doneCount} / {due.length} done today
          </p>
        </div>
      )}

      {/* the habits */}
      {habits.length > 0 ? (
        <ul className="mt-5">
          {habits.map((h) => (
            <HabitRow key={h.id} habit={h} />
          ))}
        </ul>
      ) : (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="font-sans text-[13px] text-text-secondary">
            No habits yet. What will you repeat to get there?
          </p>
          {goal && (
            <AddHabitSheet
              goalOptions={goalOptions}
              defaultGoalId={goal.id}
              triggerLabel="+ Habit"
            />
          )}
        </div>
      )}

      {goal && (
        <AddGoalSheet
          habitOptions={[]}
          goalOptions={[]}
          defaultParentId={goal.id}
          open={subGoalOpen}
          onOpenChange={setSubGoalOpen}
          hideTrigger
        />
      )}
    </section>
  );
}
