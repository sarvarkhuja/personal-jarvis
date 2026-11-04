import { createReadClient } from '@/lib/supabase/read';
import { requireUserId } from '@/lib/auth/server-user';
import { loadProfile } from '@/lib/data/profile';
import { computeStreak } from '@/lib/domain/streak';
import { isHabitDueOn } from '@/lib/domain/schedule';
import { toUserDate } from '@/lib/domain/timezone';
import {
  addDaysISO,
  buildConsistencyModel,
  buildHabitStrip,
  type HabitForModel,
} from '@/lib/domain/habit-consistency';
import { normalizeStatus, type GoalStatusValue } from '@/lib/domain/goal-display';
import { buildGoalBoard, type BoardGoal } from '@/lib/domain/goal-board';
import type { FrequencyJson } from '@/lib/schemas/habits';
import { sumSecondsByHabit } from '@/lib/domain/habit-logs';
import { AddHabitSheet } from '@/components/habits/AddHabitSheet';
import { HabitsConsistencyInstrument } from '@/components/habits/HabitsConsistencyInstrument';
import type { HabitRowData } from '@/components/habits/HabitRow';
import { AddGoalSheet } from '@/components/goals/AddGoalSheet';
import { DeadlinesStrip } from '@/components/goals/DeadlinesStrip';
import { GoalBoardCard } from '@/components/goals/GoalBoardCard';
import { FinishedGoals } from '@/components/goals/FinishedGoals';

const WINDOW_DAYS = 30;
const STRIP_DAYS = 14;
const LOG_LOOKBACK_DAYS = 60;

type HabitRecord = {
  id: string;
  name: string;
  goal_id: string | null;
  scheduled_time: string | null;
  kind: 'check' | 'counter' | 'timer';
  frequency_json: FrequencyJson;
};

type HabitLogRecord = {
  habit_id: string;
  log_date: string;
  value: number | null;
};

/**
 * Goals & Habits. Habits are grouped under the goal they serve; the original
 * consistency instrument leads, a quiet deadline strip follows, then one card
 * per goal. /goals redirects here (next.config.ts).
 */
export default async function GoalsAndHabitsPage() {
  const userId = await requireUserId();
  const supabase = await createReadClient(userId);

  const profile = await loadProfile(userId);
  const tz = profile.timezone ?? 'UTC';
  const today = toUserDate(new Date(), tz);

  const [habitsResult, logsResult, goalsResult] = await Promise.all([
    supabase
      .from('habits')
      .select('id, name, goal_id, kind, frequency_json, scheduled_time')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_logs')
      .select('habit_id, log_date, value')
      .eq('user_id', userId)
      .gte('log_date', addDaysISO(today, -LOG_LOOKBACK_DAYS)),
    supabase
      .from('goals')
      .select('id, title, status, target_date, parent_goal_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  const habits = (habitsResult.data ?? []) as HabitRecord[];
  const logs = (logsResult.data ?? []) as HabitLogRecord[];
  const goals = (goalsResult.data ?? []) as Array<BoardGoal & { status: GoalStatusValue }>;

  const activeGoalOptions = goals
    .filter((g) => normalizeStatus(g.status) === 'active')
    .map((g) => ({ id: g.id, label: g.title }));

  const logsByHabit = new Map<string, string[]>();
  for (const l of logs) {
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, []);
    logsByHabit.get(l.habit_id)!.push(l.log_date);
  }
  const todaySecondsByHabit = sumSecondsByHabit(logs, today);

  // One pass per habit: streak math, today's status, the 14-day rhythm.
  const rows: Array<HabitRowData & { goal_id: string | null; scheduled_time: string | null }> =
    habits.map((h) => {
      const dates = logsByHabit.get(h.id) ?? [];
      const streak = computeStreak(dates, h.frequency_json, today);
      return {
        id: h.id,
        name: h.name,
        kind: h.kind,
        frequency: h.frequency_json,
        scheduledTime: h.scheduled_time,
        scheduled_time: h.scheduled_time,
        goal_id: h.goal_id,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        completionRate30d: streak.completionRate30d,
        strip: buildHabitStrip(dates, h.frequency_json, today, STRIP_DAYS),
        dueToday: isHabitDueOn(h.frequency_json, today),
        doneToday: dates.includes(today),
        todaySeconds: todaySecondsByHabit.get(h.id) ?? 0,
      };
    });

  // Same inputs as the old /habits page, so the instrument's numbers are unchanged.
  const model = buildConsistencyModel(
    rows.map<HabitForModel>((r) => ({
      id: r.id,
      name: r.name,
      frequency: r.frequency,
      logDates: logsByHabit.get(r.id) ?? [],
      currentStreak: r.currentStreak,
    })),
    today,
    WINDOW_DAYS,
  );

  const board = buildGoalBoard(goals, rows);
  const undatedCount = board.cards.filter(
    (c) => c.goal && c.status === 'active' && !c.goal.target_date,
  ).length;

  return (
    <main className="w-full px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-medium tracking-tight text-text-display">
            Goals &amp; Habits
          </h1>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
            {today} · {board.activeGoalCount} {board.activeGoalCount === 1 ? 'GOAL' : 'GOALS'} ·{' '}
            {habits.length} {habits.length === 1 ? 'HABIT' : 'HABITS'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeGoalOptions.length > 0 && <AddHabitSheet goalOptions={activeGoalOptions} />}
          <AddGoalSheet habitOptions={[]} goalOptions={activeGoalOptions} />
        </div>
      </header>

      {goals.length === 0 ? (
        <section
          data-testid="goals-habits-empty"
          className="rounded-lg border border-border bg-surface p-10 text-center"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            [ NOTHING HERE YET ]
          </p>
          <p className="mx-auto mt-3 max-w-sm font-sans text-[15px] leading-snug text-text-secondary">
            Habits are how goals get built. Start with a goal, then add the habits that
            move it forward.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {habits.length > 0 && (
            <HabitsConsistencyInstrument model={model} windowDays={WINDOW_DAYS} />
          )}

          <DeadlinesStrip deadlines={board.deadlines} undatedCount={undatedCount} today={today} />

          <div data-testid="goal-board" className="columns-1 gap-4 md:columns-2 2xl:columns-3">
            {board.cards.map((card) => (
              <GoalBoardCard
                key={card.goal?.id ?? 'unlinked'}
                card={card}
                today={today}
                goalOptions={activeGoalOptions}
              />
            ))}
          </div>

          <FinishedGoals goals={board.finished} />
        </div>
      )}
    </main>
  );
}
