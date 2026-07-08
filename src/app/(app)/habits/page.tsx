import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { computeStreak } from '@/lib/domain/streak';
import { isHabitDueOn } from '@/lib/domain/schedule';
import { toUserDate } from '@/lib/domain/timezone';
import {
  buildConsistencyModel,
  buildHabitStrip,
  type HabitForModel,
} from '@/lib/domain/habit-consistency';
import type { FrequencyJson } from '@/lib/schemas/habits';
import { groupHabitsByDayPart } from '@/lib/domain/day-part';
import { sumSecondsByHabit } from '@/lib/domain/habit-logs';
import { AddHabitSheet } from '@/components/habits/AddHabitSheet';
import { HabitCard } from '@/components/habits/HabitCard';
import { HabitsConsistencyInstrument } from '@/components/habits/HabitsConsistencyInstrument';

const WINDOW_DAYS = 30;
const STRIP_DAYS = 14;

type HabitRecord = {
  id: string;
  name: string;
  scheduled_time: string | null;
  kind: 'check' | 'counter' | 'timer';
  color: string | null;
  frequency_json: FrequencyJson;
  archived_at: string | null;
  is_active: boolean | null;
  created_at: string;
};

type HabitLogRecord = {
  habit_id: string;
  log_date: string;
  value: number | null;
};

export default async function HabitsPage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  const tz = (profile as { timezone?: string } | null)?.timezone ?? 'UTC';

  const today = toUserDate(new Date(), tz);

  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceISO = since.toISOString().slice(0, 10);

  const [habitsResult, logsResult, goalsResult] = await Promise.all([
    supabase
      .from('habits')
      .select('id, name, kind, color, frequency_json, scheduled_time, archived_at, is_active, created_at')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_logs')
      .select('habit_id, log_date, value')
      .eq('user_id', userId)
      .gte('log_date', sinceISO),
    supabase
      .from('goals')
      .select('id, title')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
  ]);

  const habits = (habitsResult.data ?? []) as HabitRecord[];
  const logs = (logsResult.data ?? []) as HabitLogRecord[];
  const goalOptions = ((goalsResult.data ?? []) as Array<{ id: string; title: string }>).map(
    (g) => ({ id: g.id, label: g.title }),
  );

  const logsByHabit = new Map<string, string[]>();
  for (const l of logs) {
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, []);
    logsByHabit.get(l.habit_id)!.push(l.log_date);
  }

  const todaySecondsByHabit = sumSecondsByHabit(logs, today);

  // One pass per habit: streak math, today's status, and the 14-day rhythm.
  const cards = habits.map((h) => {
    const dates = logsByHabit.get(h.id) ?? [];
    const streak = computeStreak(dates, h.frequency_json, today);
    return {
      habit: h,
      streak,
      dueToday: isHabitDueOn(h.frequency_json, today),
      doneToday: dates.includes(today),
      strip: buildHabitStrip(dates, h.frequency_json, today, STRIP_DAYS),
    };
  });

  const sections = groupHabitsByDayPart(cards, (c) => c.habit.scheduled_time);

  const model = buildConsistencyModel(
    cards.map<HabitForModel>((c) => ({
      id: c.habit.id,
      name: c.habit.name,
      frequency: c.habit.frequency_json,
      logDates: logsByHabit.get(c.habit.id) ?? [],
      currentStreak: c.streak.currentStreak,
    })),
    today,
    WINDOW_DAYS,
  );

  return (
    <main className="w-full px-4 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-medium tracking-tight text-text-display">
            Habits
          </h1>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
            {today} · {habits.length} ACTIVE
          </p>
        </div>
        <AddHabitSheet goalOptions={goalOptions} />
      </header>

      {habits.length === 0 ? (
        <section
          data-testid="habits-empty"
          className="rounded-lg border border-border bg-surface p-10 text-center"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            [ NO HABITS YET ]
          </p>
          <p className="mx-auto mt-3 max-w-sm font-sans text-[15px] leading-snug text-text-secondary">
            Habits are how goals get built — one repeated day at a time. Add your first to
            start a streak.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          <HabitsConsistencyInstrument model={model} windowDays={WINDOW_DAYS} />

          <div data-testid="habits-list" className="space-y-8">
            {sections.map((section) => (
              <section
                key={section.part}
                data-testid={`habits-section-${section.part}`}
              >
                <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
                  {section.label}
                  <span className="text-text-secondary"> · {section.items.length}</span>
                </h2>
                <div className="columns-1 gap-4 md:columns-2 2xl:columns-3">
                  {section.items.map((c) => (
                    <HabitCard
                      key={c.habit.id}
                      habit={{
                        id: c.habit.id,
                        name: c.habit.name,
                        kind: c.habit.kind,
                        frequency: c.habit.frequency_json,
                      }}
                      scheduledTime={c.habit.scheduled_time}
                      currentStreak={c.streak.currentStreak}
                      longestStreak={c.streak.longestStreak}
                      completionRate30d={c.streak.completionRate30d}
                      strip={c.strip}
                      dueToday={c.dueToday}
                      doneToday={c.doneToday}
                      todaySeconds={todaySecondsByHabit.get(c.habit.id) ?? 0}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
