import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import {
  addDays,
  buildFocusMetrics,
  type FocusSessionLite,
} from '@/lib/utils/focus-metrics';
import { FocusConsole } from '@/components/focus/FocusConsole';
import { FocusArchive } from '@/components/focus/FocusArchive';

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  planned_minutes: number;
  completed: boolean;
  intent: string | null;
  linked_goal_id: string | null;
};

type GoalRow = { id: string; title: string; status: string };
type HabitRow = { id: string; name: string; kind: string; goal_id: string };

// Generous UTC floor so every user timezone still sees a full 60 local days.
const WINDOW_MS = 70 * 24 * 60 * 60 * 1000;

export default async function FocusPage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const now = new Date();
  const sinceIso = new Date(now.getTime() - WINDOW_MS).toISOString();

  const [profileResult, goalsResult, habitsResult, sessionsResult] =
    await Promise.all([
      supabase.from('profiles').select('timezone').eq('id', userId).single(),
      supabase
        .from('goals')
        .select('id, title, status')
        .eq('user_id', userId)
        .order('title'),
      supabase
        .from('habits')
        .select('id, name, kind, goal_id')
        .eq('user_id', userId)
        .is('archived_at', null)
        .order('name'),
      supabase
        .from('focus_sessions')
        .select(
          'id, started_at, ended_at, planned_minutes, completed, intent, linked_goal_id',
        )
        .eq('user_id', userId)
        .gte('started_at', sinceIso)
        .order('started_at', { ascending: false }),
    ]);

  const tz =
    (profileResult.data as { timezone?: string } | null)?.timezone ?? 'UTC';
  const today = toUserDate(now, tz);
  const windowStart = addDays(today, -60);

  const goals = (goalsResult.data ?? []) as GoalRow[];
  const goalLabels = new Map(goals.map((g) => [g.id, g.title]));
  const goalOptions = goals
    .filter((g) => g.status === 'active')
    .map((g) => ({ id: g.id, label: g.title }));

  const habitOptions = ((habitsResult.data ?? []) as HabitRow[]).map((h) => ({
    id: h.id,
    label: h.name,
    kind: h.kind,
    goalId: h.goal_id,
  }));

  const sessions: FocusSessionLite[] = ((sessionsResult.data ?? []) as SessionRow[])
    .map((r) => {
      const ended = r.ended_at != null;
      const startedAtMs = new Date(r.started_at).getTime();
      const durationMin = !ended
        ? 0
        : r.completed
          ? r.planned_minutes
          : Math.max(
              0,
              Math.round((new Date(r.ended_at as string).getTime() - startedAtMs) / 60000),
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
        goalLabel: r.linked_goal_id ? goalLabels.get(r.linked_goal_id) ?? null : null,
      };
    })
    .filter((s) => s.localDate >= windowStart);

  const metrics = buildFocusMetrics(sessions, today);

  return (
    <main className="w-full space-y-4 px-4 py-8 md:px-6">
      <header className="flex items-baseline justify-between gap-4 px-1">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-secondary">
          [ DEEP WORK ]
        </h1>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {new Date(`${today}T00:00:00Z`)
            .toLocaleDateString('en-GB', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              timeZone: 'UTC',
            })
            .toUpperCase()}
        </span>
      </header>

      <FocusConsole goalOptions={goalOptions} habitOptions={habitOptions} />

      <FocusArchive metrics={metrics} />
    </main>
  );
}
