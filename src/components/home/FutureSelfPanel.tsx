import { createReadClient } from '@/lib/supabase/read';
import { loadProfile } from '@/lib/data/profile';
import { toUserDate } from '@/lib/domain/timezone';
import { buildAttentionEvidence } from '@/lib/domain/future-self';
import { addDays, type FocusSessionLite } from '@/lib/utils/focus-metrics';
import type { SelfImageItem } from '@/lib/schemas/self-images';
import { FutureSelf } from './FutureSelf';

/** The default tab streams independently of the daily dashboard queries. */
export async function FutureSelfPanel({ userId, now }: { userId: string; now: Date }) {
  const supabase = await createReadClient(userId);
  const focusSince = new Date(now.getTime() - 70 * 86400000);
  focusSince.setUTCHours(0, 0, 0, 0);
  const [profile, itemsResult, goalsResult, habitsResult, focusResult] = await Promise.all([
    loadProfile(userId),
    supabase.from('self_image_items').select('id, months, pillar, body').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('goals').select('id, title, status, target_date').eq('user_id', userId).eq('status', 'active').order('target_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
    supabase.from('habits').select('id, name, frequency_json, kind, goal_id').eq('user_id', userId).is('archived_at', null).order('created_at', { ascending: true }),
    supabase.from('focus_sessions').select('id, started_at, ended_at, planned_minutes, completed, intent').eq('user_id', userId).gte('started_at', focusSince.toISOString()).order('started_at', { ascending: false }),
  ]);
  const tz = profile.timezone ?? 'UTC';
  const today = toUserDate(now, tz);
  const sessions: FocusSessionLite[] = (focusResult.data ?? []).map((r) => {
    const startedAtMs = new Date(r.started_at).getTime();
    const ended = r.ended_at != null;
    return {
      id: r.id, localDate: toUserDate(r.started_at, tz), startedAtMs,
      durationMin: !ended ? 0 : r.completed ? r.planned_minutes : Math.max(0, Math.round((new Date(r.ended_at).getTime() - startedAtMs) / 60000)),
      plannedMinutes: r.planned_minutes, completed: r.completed, ended,
      intent: r.intent, goalLabel: null,
    };
  }).filter((s) => s.localDate >= addDays(today, -60));
  const goals = goalsResult.data ?? [];
  return (
    <FutureSelf
      items={(itemsResult.data ?? []) as SelfImageItem[]}
      today={today}
      startedOn={profile.future_self_started_on ?? today}
      evidence={buildAttentionEvidence(sessions, today)}
      evidenceAvailable={!focusResult.error}
      itemsAvailable={!itemsResult.error}
      goal={goals[0]}
      focusOptions={{
        goalOptions: goals.map((g) => ({ id: g.id, label: g.title })),
        habitOptions: (habitsResult.data ?? []).map((h) => ({ id: h.id, label: h.name, kind: h.kind, goalId: h.goal_id })),
      }}
    />
  );
}
