import { LogHabitButton } from '@/components/today/LogHabitButton';
import { frequencyLabel, type DayCell } from '@/lib/domain/habit-consistency';
import { DAY_PART_LABEL, dayPartOf } from '@/lib/domain/day-part';
import type { FrequencyJson } from '@/lib/schemas/habits';
import { formatDuration } from '@/lib/utils/duration';
import { DeleteHabitButton } from './DeleteHabitButton';
import { HabitTimer } from './HabitTimer';
import { HabitTimeControl } from './HabitTimeControl';

export type HabitRowData = {
  id: string;
  name: string;
  kind: 'check' | 'counter' | 'timer';
  frequency: FrequencyJson;
  scheduledTime: string | null;
  currentStreak: number;
  longestStreak: number;
  completionRate30d: number;
  strip: DayCell[];
  dueToday: boolean;
  doneToday: boolean;
  todaySeconds: number;
};

/**
 * One habit inside a goal card. The same today-control logic as HabitCard
 * (timer / rest day / done / log), compressed into a row: identity and streak
 * on top, the 14-day rhythm across the full width, stats and the control below.
 */
export function HabitRow({ habit }: { habit: HabitRowData }) {
  const {
    id,
    name,
    kind,
    frequency,
    scheduledTime,
    currentStreak,
    longestStreak,
    completionRate30d,
    strip,
    dueToday,
    doneToday,
    todaySeconds,
  } = habit;
  const doneDays = strip.filter((c) => c.due && c.done).length;
  const dueDays = strip.filter((c) => c.due).length;
  const part = dayPartOf(scheduledTime);

  return (
    <li data-testid={`habit-row-${id}`} className="border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-mono text-[11px] uppercase tracking-[0.08em] text-text-primary">
            {name}
          </h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            {frequencyLabel(frequency)}
            {part !== 'anytime' && <> · {DAY_PART_LABEL[part]}</>}
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-1.5">
          <span
            data-testid={`streak-${id}`}
            className="font-mono text-[22px] font-medium leading-none tabular-nums text-text-display"
          >
            {currentStreak}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            {currentStreak === 1 ? 'DAY' : 'DAYS'}
          </span>
        </div>
      </div>

      {/* 14-day rhythm */}
      <div className="mt-3 flex items-center gap-[3px]" aria-hidden>
        {strip.map((c, i) => {
          const isToday = i === strip.length - 1;
          if (!c.due) {
            return (
              <span key={c.date} className="flex h-3 flex-1 items-center justify-center">
                <span className="size-[3px] rounded-full bg-border" />
              </span>
            );
          }
          return (
            <span key={c.date} className="flex h-3 flex-1 items-center justify-center">
              <span
                className={`rounded-full ${isToday ? 'size-2' : 'size-1.5'} ${
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

      <div className="mt-3 flex items-center gap-5">
        <Stat label="BEST" value={`${longestStreak}`} />
        <Stat label="30D" value={`${Math.round(completionRate30d * 100)}%`} />
        <DeleteHabitButton habitId={id} habitName={name} />
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {kind === 'timer' ? (
            <>
              <HabitTimeControl habitId={id} scheduledTime={scheduledTime} />
              {todaySeconds > 0 && (
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-success">
                  {formatDuration(todaySeconds)} ✓
                </span>
              )}
              <HabitTimer habitId={id} />
            </>
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
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
      {label}
      <span className="text-[12px] tabular-nums tracking-[0.04em] text-text-primary">{value}</span>
    </span>
  );
}
