import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate, userDayBounds } from '@/lib/domain/timezone';
import { formatInTimeZone } from 'date-fns-tz';
import { isHabitDueOn } from '@/lib/domain/schedule';
import type { FrequencyJson } from '@/lib/schemas/habits';
import { HabitsDueWidget } from '@/components/today/HabitsDueWidget';
import { PillsDueWidget } from '@/components/today/PillsDueWidget';
import { TopGoalsWidget } from '@/components/today/TopGoalsWidget';
import { UpcomingEventsWidget } from '@/components/today/UpcomingEventsWidget';
import { FocusTodayWidget } from '@/components/today/FocusTodayWidget';
import { DayStrip, type StripEvent } from '@/components/today/DayStrip';

export default async function TodayPage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  const tz = (profile as { timezone?: string } | null)?.timezone ?? 'UTC';

  const now = new Date();
  const today = toUserDate(now, tz);
  const { startUtc, endUtc } = userDayBounds(today, tz);
  // Tomorrow's day window — used by the upcoming-events widget.
  const tomorrowDate = new Date(`${today}T00:00:00Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  const { startUtc: tomorrowStartUtc, endUtc: tomorrowEndUtc } =
    userDayBounds(tomorrow, tz);

  const [
    habitsResult,
    todayHabitLogsResult,
    medicationsResult,
    todayDoseLogsResult,
    activeGoalsResult,
    upcomingEventsResult,
    focusSessionsResult,
  ] = await Promise.all([
    supabase
      .from('habits')
      .select('id, name, kind, frequency_json')
      .eq('user_id', userId)
      .is('archived_at', null),
    supabase
      .from('habit_logs')
      .select('habit_id, log_date')
      .eq('user_id', userId)
      .gte('logged_at', startUtc.toISOString())
      .lt('logged_at', endUtc.toISOString()),
    supabase
      .from('medications')
      .select('id, name')
      .eq('user_id', userId)
      .is('archived_at', null),
    supabase
      .from('medication_logs')
      .select('medication_id, log_date')
      .eq('user_id', userId)
      .eq('log_date', today),
    supabase
      .from('goals')
      .select('id, title, status, target_date')
      .eq('user_id', userId)
      .eq('status', 'active'),
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
      .gte('started_at', startUtc.toISOString())
      .lt('started_at', endUtc.toISOString())
      .order('started_at', { ascending: false }),
  ]);

  const habits = (habitsResult.data ?? []) as Array<{
    id: string;
    name: string;
    kind: 'check' | 'counter' | 'timer';
    frequency_json: FrequencyJson;
  }>;
  const logsToday = (todayHabitLogsResult.data ?? []) as Array<{
    habit_id: string;
    log_date: string;
  }>;
  const medications = (medicationsResult.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const doseLogs = (todayDoseLogsResult.data ?? []) as Array<{
    medication_id: string;
    log_date: string;
  }>;
  const loggedPillIds = doseLogs.map((l) => l.medication_id);
  const loggedPillSet = new Set(loggedPillIds);
  const activeGoals = (activeGoalsResult.data ?? []) as Array<{
    id: string;
    title: string;
    status: 'active';
    target_date: string | null;
  }>;

  const upcomingEvents = (upcomingEventsResult.data ?? []) as Array<{
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
  // tomorrowStartUtc is included in the bounds expression above; reference here
  // so TypeScript doesn't flag it as unused.
  void tomorrowStartUtc;

  const focusSessions = (focusSessionsResult.data ?? []) as Array<{
    id: string;
    started_at: string;
    ended_at: string | null;
    planned_minutes: number;
    completed: boolean;
    intent: string | null;
  }>;

  // ── derived figures for the DAY STRIP signature ──────────────────────────
  const dueHabits = habits.filter((h) => isHabitDueOn(h.frequency_json, today));
  const loggedHabitSet = new Set(logsToday.map((l) => l.habit_id));
  const openHabits = dueHabits.filter((h) => !loggedHabitSet.has(h.id)).length;
  const pendingPills = medications.filter((m) => !loggedPillSet.has(m.id)).length;
  const focusMinutes = focusSessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.planned_minutes, 0);

  const eventMinutes = (iso: string) =>
    Number(formatInTimeZone(iso, tz, 'H')) * 60 +
    Number(formatInTimeZone(iso, tz, 'm'));
  const stripEvents: StripEvent[] = todayEvents
    .map((e) => ({
      id: e.id,
      title: e.title,
      kind: e.kind,
      startMin: eventMinutes(e.starts_at),
      endMin: e.ends_at ? eventMinutes(e.ends_at) : null,
      timeLabel: formatInTimeZone(e.starts_at, tz, 'HH:mm'),
    }))
    .sort((a, b) => a.startMin - b.startMin);

  const dateLabel = formatInTimeZone(now, tz, 'EEE d MMM').toUpperCase();
  const nowLabel = formatInTimeZone(now, tz, 'HH:mm');
  const nowMinutes =
    Number(formatInTimeZone(now, tz, 'H')) * 60 +
    Number(formatInTimeZone(now, tz, 'm'));

  return (
    <main className="w-full space-y-4 px-4 py-8">
      <h1 className="sr-only">Today · {today}</h1>

      <DayStrip
        dateLabel={dateLabel}
        nowLabel={nowLabel}
        nowMinutes={nowMinutes}
        openHabits={openHabits}
        pendingPills={pendingPills}
        focusMinutes={focusMinutes}
        events={stripEvents}
      />

      <div className="gap-4 lg:columns-2 xl:columns-3">
        <HabitsDueWidget habits={habits} logsToday={logsToday} today={today} />
        <PillsDueWidget
          medications={medications}
          loggedTodayIds={loggedPillIds}
          today={today}
        />
        <UpcomingEventsWidget
          todayEvents={todayEvents}
          tomorrowEvents={tomorrowEvents}
          tz={tz}
        />
        <TopGoalsWidget goals={activeGoals} today={today} />
        <FocusTodayWidget sessions={focusSessions} tz={tz} />
      </div>
    </main>
  );
}
