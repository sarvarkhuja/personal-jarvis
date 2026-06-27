import { isHabitDueOn } from '@/lib/domain/schedule';
import type { FrequencyJson } from '@/lib/schemas/habits';
import { LogHabitButton } from './LogHabitButton';
import { WidgetCard, WidgetCount, WidgetEmpty, WidgetLink } from './WidgetCard';

type Habit = {
  id: string;
  name: string;
  emoji: string | null;
  kind: 'check' | 'counter' | 'timer';
  frequency_json: FrequencyJson;
};

type HabitLog = { habit_id: string; log_date: string };

export function HabitsDueWidget({
  habits,
  logsToday,
  today,
}: {
  habits: Habit[];
  logsToday: HabitLog[];
  today: string;
}) {
  const due = habits.filter((h) => isHabitDueOn(h.frequency_json, today));
  const loggedSet = new Set(logsToday.map((l) => l.habit_id));
  const remaining = due.filter((h) => !loggedSet.has(h.id)).length;

  return (
    <WidgetCard
      title="[ HABITS DUE ]"
      testid="habits-due-widget"
      right={
        <>
          <WidgetCount>{remaining} LEFT</WidgetCount>
          <WidgetLink href="/habits">ALL</WidgetLink>
        </>
      }
    >
      {due.length === 0 ? (
        <WidgetEmpty>Nothing due today</WidgetEmpty>
      ) : (
        <ul className="-mt-1">
          {due.map((h) => {
            const logged = loggedSet.has(h.id);
            return (
              <li
                key={h.id}
                data-testid={`due-${h.id}`}
                className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden className="text-base leading-none">
                    {h.emoji ?? '·'}
                  </span>
                  <span className="truncate font-sans text-[14px] text-text-primary">
                    {h.name}
                  </span>
                  {logged && (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-success">
                      done
                    </span>
                  )}
                </div>
                <LogHabitButton
                  habitId={h.id}
                  kind={h.kind}
                  alreadyLogged={logged}
                />
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
