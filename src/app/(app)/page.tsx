import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate, userDayBounds } from '@/lib/domain/timezone';
import { formatInTimeZone } from 'date-fns-tz';
import { computeStreak } from '@/lib/domain/streak';
import {
  addDaysISO,
  buildConsistencyModel,
  type HabitForModel,
} from '@/lib/domain/habit-consistency';
import {
  addDays,
  buildFocusMetrics,
  type FocusSessionLite,
} from '@/lib/utils/focus-metrics';
import type { FrequencyJson } from '@/lib/schemas/habits';
import {
  bodyWeightSummary,
  monthSpendSummary,
  pillWeekAdherence,
} from '@/lib/domain/home-overview';
import { HabitsConsistencyInstrument } from '@/components/habits/HabitsConsistencyInstrument';
import { TopGoalsWidget } from '@/components/today/TopGoalsWidget';
import { UpcomingEventsWidget } from '@/components/today/UpcomingEventsWidget';
import { ExpensesGlance } from '@/components/home/ExpensesGlance';
import { FocusGlance } from '@/components/home/FocusGlance';
import { PillsGlance } from '@/components/home/PillsGlance';
import { LiftsGlance } from '@/components/home/LiftsGlance';
import { BodyWeightGlance } from '@/components/home/BodyWeightGlance';
import { SalahGlance } from '@/components/home/SalahGlance';
import { loadSalahConfig } from '@/lib/data/salah';
import {
  salahDaySummary,
  type LoggedPrayer,
  type PrayerName,
  type SalahStatus,
  type JamaatKind,
} from '@/lib/domain/salah';
import {
  weekStart,
  buildLiftRows,
  type LiftEntry,
} from '@/lib/utils/lift-metrics';

const HABIT_WINDOW_DAYS = 30;
const FOCUS_WINDOW_MS = 70 * 24 * 60 * 60 * 1000;
const LIFT_WEEKS = 2; // current + previous week, enough for the weekly trend
const WEIGHT_TREND_DAYS = 90;

export default async function HomePage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, timezone, target_weight_kg')
    .eq('id', userId)
    .single();
  const displayName =
    (profile as { display_name?: string | null } | null)?.display_name ?? null;
  const tz = (profile as { timezone?: string } | null)?.timezone ?? 'UTC';

  const now = new Date();
  const today = toUserDate(now, tz);
  const tomorrow = addDaysISO(today, 1);

  // Query windows.
  const habitSince = addDaysISO(today, -60);
  const pillSince = addDaysISO(today, -6);
  const { startUtc } = userDayBounds(today, tz);
  const { endUtc: tomorrowEndUtc } = userDayBounds(tomorrow, tz);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);
  const focusSinceIso = new Date(now.getTime() - FOCUS_WINDOW_MS).toISOString();
  const thisMonday = weekStart(today);
  const liftSince = addDaysISO(thisMonday, -7 * (LIFT_WEEKS - 1));
  const weightSince = addDaysISO(today, -(WEIGHT_TREND_DAYS - 1));

  const [
    habitsResult,
    habitLogsResult,
    activeGoalsResult,
    expensesResult,
    medicationsResult,
    medicationLogsResult,
    eventsResult,
    focusSessionsResult,
    weeklyLiftsResult,
    bodyMetricsResult,
    salahLogsResult,
  ] = await Promise.all([
    supabase
      .from('habits')
      .select('id, name, frequency_json')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_logs')
      .select('habit_id, log_date')
      .eq('user_id', userId)
      .gte('log_date', habitSince),
    supabase
      .from('goals')
      .select('id, title, status, target_date')
      .eq('user_id', userId)
      .eq('status', 'active'),
    supabase
      .from('expenses')
      .select('amount, date')
      .eq('user_id', userId)
      .gte('date', sixMonthsAgoStr),
    supabase
      .from('medications')
      .select('id, name')
      .eq('user_id', userId)
      .is('archived_at', null),
    supabase
      .from('medication_logs')
      .select('medication_id, log_date')
      .eq('user_id', userId)
      .gte('log_date', pillSince),
    supabase
      .from('events')
      .select('id, title, starts_at, ends_at, kind')
      .eq('user_id', userId)
      .gte('starts_at', startUtc.toISOString())
      .lt('starts_at', tomorrowEndUtc.toISOString())
      .order('starts_at', { ascending: true }),
    supabase
      .from('focus_sessions')
      .select('id, started_at, ended_at, planned_minutes, completed, intent')
      .eq('user_id', userId)
      .gte('started_at', focusSinceIso)
      .order('started_at', { ascending: false }),
    supabase
      .from('weekly_lifts')
      .select('exercise, week_start, weight_kg, reps')
      .eq('user_id', userId)
      .gte('week_start', liftSince),
    supabase
      .from('body_metrics')
      .select('date, weight_kg')
      .eq('user_id', userId)
      .gte('date', weightSince),
    supabase
      .from('salah_logs')
      .select('prayer, log_date, status, jamaat')
      .eq('user_id', userId)
      .gte('log_date', habitSince),
  ]);

  // ── Habit consistency hero ──────────────────────────────────────────────
  const habits = (habitsResult.data ?? []) as Array<{
    id: string;
    name: string;
    frequency_json: FrequencyJson;
  }>;
  const habitLogs = (habitLogsResult.data ?? []) as Array<{
    habit_id: string;
    log_date: string;
  }>;
  const logsByHabit = new Map<string, string[]>();
  for (const l of habitLogs) {
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, []);
    logsByHabit.get(l.habit_id)!.push(l.log_date);
  }
  const habitModel = buildConsistencyModel(
    habits.map<HabitForModel>((h) => {
      const dates = logsByHabit.get(h.id) ?? [];
      return {
        id: h.id,
        name: h.name,
        frequency: h.frequency_json,
        logDates: dates,
        currentStreak: computeStreak(dates, h.frequency_json, today).currentStreak,
      };
    }),
    today,
    HABIT_WINDOW_DAYS,
  );

  // ── Goals ────────────────────────────────────────────────────────────────
  const activeGoals = (activeGoalsResult.data ?? []) as Array<{
    id: string;
    title: string;
    status: 'active';
    target_date: string | null;
  }>;

  // ── Expenses ───────────────────────────────────────────────────────────────
  const expenses = (expensesResult.data ?? []) as Array<{
    amount: number;
    date: string;
  }>;
  const spend = monthSpendSummary(expenses, today);

  // ── Pills ──────────────────────────────────────────────────────────────────
  const medications = (medicationsResult.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const medicationLogs = (medicationLogsResult.data ?? []) as Array<{
    medication_id: string;
    log_date: string;
  }>;
  const pills = pillWeekAdherence(medications, medicationLogs, today);

  // ── Lifts (big-5 this week) ─────────────────────────────────────────────────
  const weeklyLifts = (weeklyLiftsResult.data ?? []) as Array<{
    exercise: LiftEntry['exercise'];
    week_start: string;
    weight_kg: number | string | null;
    reps: number;
  }>;
  const liftEntries: LiftEntry[] = weeklyLifts.map((l) => ({
    exercise: l.exercise,
    week_start: l.week_start,
    weight_kg: l.weight_kg != null ? Number(l.weight_kg) : null,
    reps: l.reps,
  }));
  const liftRows = buildLiftRows(liftEntries, today, LIFT_WEEKS);
  const liftsLoggedCount = liftRows.filter((r) => r.current != null).length;

  // ── Body weight (→ target) ──────────────────────────────────────────────────
  const bodyMetrics = (bodyMetricsResult.data ?? []) as Array<{
    date: string;
    weight_kg: number | string | null;
  }>;
  const targetWeight =
    (profile as { target_weight_kg?: number | string | null } | null)?.target_weight_kg != null
      ? Number((profile as { target_weight_kg?: number | string | null }).target_weight_kg)
      : null;
  const bodyWeight = bodyWeightSummary(
    bodyMetrics.map((b) => ({
      date: b.date,
      weight_kg: b.weight_kg != null ? Number(b.weight_kg) : null,
    })),
    targetWeight,
    today,
    WEIGHT_TREND_DAYS,
  );

  // ── Events (today + tomorrow agenda) ────────────────────────────────────────
  const upcomingEvents = (eventsResult.data ?? []) as Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    kind: 'event' | 'appointment' | 'milestone';
  }>;
  const todayEvents = upcomingEvents
    .map((e) => ({ ...e, localDate: toUserDate(e.starts_at, tz) }))
    .filter((e) => e.localDate === today);
  const tomorrowEvents = upcomingEvents
    .map((e) => ({ ...e, localDate: toUserDate(e.starts_at, tz) }))
    .filter((e) => e.localDate === tomorrow);

  // ── Focus (this week + streak) ──────────────────────────────────────────────
  const focusWindowStart = addDays(today, -60);
  const focusSessions: FocusSessionLite[] = (
    (focusSessionsResult.data ?? []) as Array<{
      id: string;
      started_at: string;
      ended_at: string | null;
      planned_minutes: number;
      completed: boolean;
      intent: string | null;
    }>
  )
    .map((r) => {
      const ended = r.ended_at != null;
      const startedAtMs = new Date(r.started_at).getTime();
      const durationMin = !ended
        ? 0
        : r.completed
          ? r.planned_minutes
          : Math.max(
              0,
              Math.round(
                (new Date(r.ended_at as string).getTime() - startedAtMs) / 60000,
              ),
            );
      return {
        id: r.id,
        localDate: toUserDate(r.started_at, tz),
        startedAtMs,
        durationMin,
        plannedMinutes: r.planned_minutes,
        completed: r.completed,
        ended,
        intent: r.intent,
        goalLabel: null,
      };
    })
    .filter((s) => s.localDate >= focusWindowStart);
  const focusMetrics = buildFocusMetrics(focusSessions, today);

  // ── Salah (today) ────────────────────────────────────────────────────────
  const salahCfg = await loadSalahConfig(supabase, userId);
  const salahToday = toUserDate(now, salahCfg.timezone);
  const salahRows = (salahLogsResult.data ?? []) as Array<{
    prayer: PrayerName;
    log_date: string;
    status: SalahStatus;
    jamaat: JamaatKind | null;
  }>;
  const salahByDate = new Map<string, LoggedPrayer[]>();
  for (const r of salahRows) {
    if (!salahByDate.has(r.log_date)) salahByDate.set(r.log_date, []);
    // Guard against any legacy duplicate (prayer,date) rows.
    const day = salahByDate.get(r.log_date)!;
    if (!day.some((l) => l.prayer === r.prayer)) {
      day.push({ prayer: r.prayer, status: r.status, jamaat: r.jamaat });
    }
  }
  const salahSummary = salahDaySummary(
    salahCfg,
    salahByDate.get(salahToday) ?? [],
    salahByDate,
    now,
    salahToday,
  );

  const dateLabel = formatInTimeZone(now, tz, 'EEE d MMMM yyyy').toUpperCase();

  return (
    <main className="w-full space-y-4 px-4 py-8">
      <header className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">
            JARVIS
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            {dateLabel}
          </p>
        </div>
        {displayName && (
          <div className="flex size-10 shrink-0 items-center justify-center border border-border-visible font-mono text-[13px] uppercase text-text-primary">
            {displayName[0].toUpperCase()}
          </div>
        )}
      </header>

      <HabitsConsistencyInstrument
        model={habitModel}
        windowDays={HABIT_WINDOW_DAYS}
        href="/habits"
      />

      <div className="gap-4 lg:columns-2 xl:columns-3">
        <TopGoalsWidget goals={activeGoals} today={today} />
        <ExpensesGlance summary={spend} />
        <FocusGlance week={focusMetrics.week} streakCount={focusMetrics.streak.count} />
        <PillsGlance adherence={pills} />
        <SalahGlance summary={salahSummary} />
        <LiftsGlance rows={liftRows} loggedCount={liftsLoggedCount} />
        <BodyWeightGlance summary={bodyWeight} days={WEIGHT_TREND_DAYS} />
        <UpcomingEventsWidget
          todayEvents={todayEvents}
          tomorrowEvents={tomorrowEvents}
          tz={tz}
        />
      </div>
    </main>
  );
}
