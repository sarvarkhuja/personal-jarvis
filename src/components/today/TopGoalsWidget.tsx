import { topGoalsNearestTarget } from '@/lib/domain/goals';
import {
  countdownFor,
  TONE_TEXT,
  type Tone,
} from '@/lib/domain/goal-display';
import { WidgetCard, WidgetEmpty, WidgetLink } from './WidgetCard';

type Goal = {
  id: string;
  title: string;
  status: 'active' | 'done' | 'abandoned' | 'completed' | 'paused';
  target_date: string | null;
};

const dotBg: Record<Tone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  muted: 'bg-text-disabled',
  primary: 'bg-text-primary',
};

export function TopGoalsWidget({
  goals,
  today,
}: {
  goals: Goal[];
  today: string;
}) {
  const top = topGoalsNearestTarget(goals, 3, today);

  return (
    <WidgetCard
      title="[ GOALS ]"
      testid="top-goals-widget"
      right={<WidgetLink href="/goals">ALL</WidgetLink>}
    >
      {top.length === 0 ? (
        <WidgetEmpty>No active goals</WidgetEmpty>
      ) : (
        <ul className="-mt-1">
          {top.map((g) => {
            const cd = countdownFor(g.target_date, today, g.status);
            return (
              <li
                key={g.id}
                data-testid={`top-goal-${g.id}`}
                className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    aria-hidden
                    className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dotBg[cd.tone]}`}
                  />
                  <span className="truncate font-sans text-[14px] leading-snug text-text-primary">
                    {g.title}
                  </span>
                </div>
                <span
                  className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] ${TONE_TEXT[cd.tone]}`}
                >
                  {cd.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
