import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import { monthAnchor, nextMonth } from '@/lib/domain/calendar';
import { isHabitDueOn } from '@/lib/domain/schedule';
import { formatInTimeZone } from 'date-fns-tz';
import type { FrequencyJson } from '@/lib/schemas/habits';
import {
  MonthGrid,
  type EventLite,
  type HabitLite,
} from '@/components/plans/MonthGrid';
import {
  WeekList,
  type EventListItem,
  type DayBucket,
} from '@/components/plans/WeekList';
import { MonthNav } from '@/components/plans/MonthNav';

const ANCHOR_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeAnchor(input: string | undefined, today: string): string {
  if (input && ANCHOR_RE.test(input)) return `${input.slice(0, 7)}-01`;
  return monthAnchor(new Date(today + 'T00:00:00Z'));
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const sp = await searchParams;

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  const tz = (profile as { timezone?: string } | null)?.timezone ?? 'UTC';

  const today = toUserDate(new Date(), tz);
  const anchor = normalizeAnchor(sp.m, today);
  const followingAnchor = nextMonth(anchor);

  // Build a generous time range: 7 days before the grid start to 7 days after
  // the grid end. The grid always starts on a Monday on-or-before the 1st.
  const rangeStart = new Date(`${anchor}T00:00:00Z`);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 14);
  const rangeEnd = new Date(`${followingAnchor}T00:00:00Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 14);
  const rangeStartDate = rangeStart.toISOString().slice(0, 10);
  const rangeEndDate = rangeEnd.toISOString().slice(0, 10);

  const [eventsResult, goalsResult, habitsResult, habitLogsResult] =
    await Promise.all([
      supabase
        .from('events')
        .select('id, title, description, starts_at, ends_at, kind')
        .eq('user_id', userId)
        .gte('starts_at', rangeStart.toISOString())
        .lt('starts_at', rangeEnd.toISOString())
        .order('starts_at', { ascending: true }),
      supabase
        .from('goals')
        .select('id, title')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('title', { ascending: true }),
      supabase
        .from('habits')
        .select('id, name, emoji, color, frequency_json')
        .eq('user_id', userId)
        .is('archived_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('habit_logs')
        .select('habit_id, log_date')
        .eq('user_id', userId)
        .gte('log_date', rangeStartDate)
        .lt('log_date', rangeEndDate),
    ]);

  const events = (eventsResult.data ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    kind: 'event' | 'appointment' | 'milestone';
  }>;
  const goalOptions = (
    (goalsResult.data ?? []) as Array<{ id: string; title: string }>
  ).map((g) => ({ id: g.id, label: g.title }));
  const habits = (habitsResult.data ?? []) as Array<{
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
    frequency_json: FrequencyJson;
  }>;
  const habitLogs = (habitLogsResult.data ?? []) as Array<{
    habit_id: string;
    log_date: string;
  }>;

  const habitsForGrid: HabitLite[] = habits.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    color: h.color,
  }));

  const habitLogsByDate = new Map<string, string[]>();
  for (const l of habitLogs) {
    if (!habitLogsByDate.has(l.log_date)) habitLogsByDate.set(l.log_date, []);
    habitLogsByDate.get(l.log_date)!.push(l.habit_id);
  }

  const eventsForGrid: EventLite[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    starts_at: e.starts_at,
    localDate: toUserDate(e.starts_at, tz),
    kind: e.kind,
  }));

  // "Week list": next 7 calendar days in user TZ, grouped per day with events
  // and the day's due habits (with logged status).
  const todayDate = new Date(`${today}T00:00:00Z`);
  const eventsByLocalDate = new Map<string, EventListItem[]>();
  for (const e of events) {
    const date = toUserDate(e.starts_at, tz);
    const item: EventListItem = {
      id: e.id,
      title: e.title,
      description: e.description,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      kind: e.kind,
    };
    if (!eventsByLocalDate.has(date)) eventsByLocalDate.set(date, []);
    eventsByLocalDate.get(date)!.push(item);
  }

  const days: DayBucket[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayDate);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    const dayEvents = (eventsByLocalDate.get(date) ?? []).slice().sort((a, b) =>
      a.starts_at.localeCompare(b.starts_at),
    );
    const loggedSet = new Set(habitLogsByDate.get(date) ?? []);
    const dueHabits = habits
      .filter((h) => isHabitDueOn(h.frequency_json, date))
      .map((h) => ({
        id: h.id,
        name: h.name,
        emoji: h.emoji,
        logged: loggedSet.has(h.id),
      }));
    const label =
      i === 0
        ? 'Today'
        : i === 1
          ? 'Tomorrow'
          : formatInTimeZone(d, tz, 'EEE d LLL');
    days.push({ date, label, events: dayEvents, habits: dueHabits });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-medium">Plans</h1>
          <p className="text-sm text-muted-foreground">
            Click a day to add an event. Today is {today}.
          </p>
        </div>
      </header>

      <MonthNav anchor={anchor} today={today} />

      <MonthGrid
        anchor={anchor}
        events={eventsForGrid}
        today={today}
        goalOptions={goalOptions}
        habits={habitsForGrid}
        habitLogsByDate={habitLogsByDate}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Next 7 days</h2>
        <WeekList days={days} tz={tz} />
      </section>
    </main>
  );
}
