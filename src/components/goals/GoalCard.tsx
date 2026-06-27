import type { GoalNode } from '@/lib/domain/goals';
import { countdownFor, TONE_TEXT } from '@/lib/domain/goal-display';
import type { GoalRecord } from './GoalsView';
import { GoalStatusButtons } from './GoalStatusButtons';
import { AddGoalSheet } from './AddGoalSheet';

type Option = { id: string; label: string };

/** Small status dot — colour borrowed from the countdown tone so the dot, the
 *  chip, and the hero all speak with one voice. */
function Dot({ tone }: { tone: keyof typeof TONE_TEXT }) {
  const bg =
    tone === 'accent'
      ? 'bg-accent'
      : tone === 'success'
        ? 'bg-success'
        : tone === 'muted'
          ? 'bg-text-disabled'
          : 'bg-text-primary';
  return (
    <span
      aria-hidden
      className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${bg}`}
    />
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-visible px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
      {children}
    </span>
  );
}

/**
 * One node of the goal tree. The root (`depth === 0`) is a standalone masonry
 * card; descendants render as indented rows inside it — indentation alone is
 * the hierarchy, no tree lines, per the Nothing list pattern.
 */
function GoalNodeRow({
  node,
  today,
  depth,
  habitNameById,
  habitOptions,
}: {
  node: GoalNode<GoalRecord>;
  today: string;
  depth: number;
  habitNameById: Map<string, string>;
  habitOptions: Option[];
}) {
  const cd = countdownFor(node.target_date, today, node.status);
  const habitName = node.linked_habit_id
    ? habitNameById.get(node.linked_habit_id)
    : undefined;
  const titleSize = depth === 0 ? 'text-[15px]' : 'text-[13px]';

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Dot tone={cd.tone} />
          <div className="min-w-0">
            <h3
              data-testid={`goal-title-${node.id}`}
              className={`font-sans ${titleSize} font-medium leading-snug text-text-primary`}
            >
              {node.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.08em] ${TONE_TEXT[cd.tone]}`}
              >
                {cd.label}
              </span>
              {habitName && (
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                  ↳ {habitName}
                </span>
              )}
            </div>
            {depth === 0 && node.description && (
              <p className="mt-2 font-sans text-[13px] leading-snug text-text-secondary">
                {node.description}
              </p>
            )}
          </div>
        </div>
        <GoalStatusButtons
          goalId={node.id}
          goalTitle={node.title}
          status={node.status}
        />
      </div>

      <div className="mt-2.5 pl-4">
        <AddGoalSheet
          habitOptions={habitOptions}
          goalOptions={[]}
          defaultParentId={node.id}
          triggerLabel="+ SUB-GOAL"
        />
      </div>

      {node.children.length > 0 && (
        <div className="mt-2.5 space-y-2.5 border-l border-border pl-4">
          {node.children.map((child) => (
            <GoalNodeRow
              key={child.id}
              node={child}
              today={today}
              depth={depth + 1}
              habitNameById={habitNameById}
              habitOptions={habitOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalCard({
  node,
  today,
  habitNameById,
  habitOptions,
}: {
  node: GoalNode<GoalRecord>;
  today: string;
  habitNameById: Map<string, string>;
  habitOptions: Option[];
}) {
  const subCount = node.children.length;
  return (
    <section
      data-testid={`goal-${node.id}`}
      className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-5"
    >
      {subCount > 0 && (
        <div className="mb-4 flex justify-end">
          <Chip>
            {subCount} SUB-GOAL{subCount === 1 ? '' : 'S'}
          </Chip>
        </div>
      )}
      <GoalNodeRow
        node={node}
        today={today}
        depth={0}
        habitNameById={habitNameById}
        habitOptions={habitOptions}
      />
    </section>
  );
}
