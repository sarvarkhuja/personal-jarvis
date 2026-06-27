import { LogHabitButton } from '@/components/today/LogHabitButton';
import { frequencyLabel, type DayCell } from '@/lib/domain/habit-consistency';
import type { FrequencyJson } from '@/lib/schemas/habits';
import { DeleteHabitButton } from './DeleteHabitButton';
import { HabitTimer } from './HabitTimer';
import { HabitTimeControl } from './HabitTimeControl';

type Props = {
  habit: {
    id: string;
    name: string;
    kind: 'check' | 'counter' | 'timer';
    frequency: FrequencyJson;
  };
  currentStreak: number;
  longestStreak: number;
  completionRate30d: number;
  strip: DayCell[];
  dueToday: boolean;
  doneToday: boolean;
  scheduledTime: string | null;
};

/**
 * One habit as a self-contained masonry widget. Its primary layer is the
 * current-streak number (Space Mono — the page's only Doto belongs to the
 * hero). A 14-day dot-rhythm carries the secondary story; stats and the
 * today-control sit at the base.
 */
export function HabitCard({
  habit,
  currentStreak,
  longestStreak,
  completionRate30d,
  strip,
  dueToday,
  doneToday,
  scheduledTime,
}: Props) {
  const { id, name, kind, frequency } = habit;
  const doneDays = strip.filter((c) => c.due && c.done).length;
  const dueDays = strip.filter((c) => c.due).length;

  return (
    <section
      data-testid={`habit-row-${id}`}
      className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6"
    >
      {/* header: identity + schedule */}
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <h2 className="flex min-w-0 items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          <span className="truncate text-text-primary">{name}</span>
        </h2>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            {frequencyLabel(frequency)}
          </span>
          {kind === 'timer' && (
            <HabitTimeControl habitId={id} scheduledTime={scheduledTime} />
          )}
        </div>
      </header>

      {/* primary: current streak + today control */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span
            data-testid={`streak-${id}`}
            className="font-mono text-4xl font-medium leading-none tabular-nums text-text-display"
          >
            {currentStreak}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            {currentStreak === 1 ? 'DAY' : 'DAYS'}
            <br />
            STREAK
          </span>
        </div>

        <div className="shrink-0">
          {kind === 'timer' ? (
            <HabitTimer habitId={id} />
          ) : !dueToday ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
              REST DAY
            </span>
          ) : doneToday ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-success">
              DONE ✓
            </span>
          ) : (
            <LogHabitButton habitId={id} kind={kind} alreadyLogged={false} />
          )}
        </div>
      </div>

      {/* secondary: 14-day rhythm */}
      <div className="mt-6 flex items-center gap-[3px]" aria-hidden>
        {strip.map((c, i) => {
          const isToday = i === strip.length - 1;
          if (!c.due) {
            return (
              <span key={c.date} className="flex h-4 flex-1 items-center justify-center">
                <span className="size-[3px] rounded-full bg-border" />
              </span>
            );
          }
          const size = isToday ? 'size-2.5' : 'size-2';
          return (
            <span key={c.date} className="flex h-4 flex-1 items-center justify-center">
              <span
                className={`rounded-full ${size} ${
                  c.done ? 'bg-text-primary' : 'border border-border-visible'
                }`}
              />
            </span>
          );
        })}
      </div>
      <span className="sr-only">
        Last {strip.length} days: {doneDays} of {dueDays} due days completed.
      </span>

      {/* tertiary: stats + delete */}
      <div className="mt-5 flex items-center gap-8">
        <Stat label="BEST" value={`${longestStreak}`} />
        <Stat label="30D" value={`${Math.round(completionRate30d * 100)}%`} />
        <div className="ml-auto">
          <DeleteHabitButton habitId={id} habitName={name} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
        {label}
      </div>
      <div className="font-mono text-[13px] tabular-nums tracking-[0.04em] text-text-primary">
        {value}
      </div>
    </div>
  );
}
