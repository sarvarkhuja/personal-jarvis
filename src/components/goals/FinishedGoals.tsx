import { normalizeStatus } from '@/lib/domain/goal-display';
import type { BoardGoal } from '@/lib/domain/goal-board';
import { GoalActionsMenu } from './GoalActionsMenu';

const LABEL = { done: 'DONE', paused: 'PAUSED', abandoned: 'ABANDONED', active: '' } as const;

/**
 * Paused, done and abandoned goals with no active habits. Closed by default —
 * they're history, but the ⋯ menu keeps resume and delete one tap away.
 */
export function FinishedGoals({ goals }: { goals: BoardGoal[] }) {
  if (goals.length === 0) return null;
  return (
    <details data-testid="finished-goals" className="group mt-4 rounded-lg border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary [&::-webkit-details-marker]:hidden">
        <span>
          [ FINISHED &amp; PAUSED · {goals.length} ]
        </span>
        <span aria-hidden className="transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none">
          ›
        </span>
      </summary>
      <ul className="px-6 pb-4">
        {goals.map((g) => (
          <li
            key={g.id}
            data-testid={`finished-goal-${g.id}`}
            className="flex items-center justify-between gap-3 border-t border-border py-3"
          >
            <span className="min-w-0 truncate font-sans text-[14px] text-text-secondary">{g.title}</span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                {LABEL[normalizeStatus(g.status)]}
              </span>
              <GoalActionsMenu goalId={g.id} goalTitle={g.title} status={g.status} />
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
