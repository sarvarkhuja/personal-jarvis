'use server';

import { invalidateUserData } from '@/lib/data/invalidate';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import {
  EndFocusSessionSchema,
  StartFocusSessionSchema,
  type EndFocusSessionInput,
  type StartFocusSessionInput,
} from '@/lib/schemas/focus';

async function authedClient() {
  const userId = await requireUserId();
  const supabase = await createClient();
  return { supabase, userId };
}

function failed(name: string, error: { message: string; details?: string | null }) {
  console.error(`[${name}] supabase error:`, error);
  throw new Error(
    `${name} failed: ${error.message}${error.details ? ` (${error.details})` : ''}`,
  );
}

export async function startFocusSession(input: StartFocusSessionInput) {
  const parsed = StartFocusSessionSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      planned_minutes: parsed.planned_minutes,
      intent: parsed.intent ?? null,
      linked_goal_id: parsed.linked_goal_id ?? null,
      linked_habit_id: parsed.linked_habit_id ?? null,
    })
    .select()
    .single();

  if (error) failed('startFocusSession', error);
  invalidateUserData(userId, 'focus_sessions');
  return data;
}

export async function endFocusSession(input: EndFocusSessionInput) {
  const parsed = EndFocusSessionSchema.parse(input);
  const { supabase, userId } = await authedClient();

  // Load the session so we know the planned duration and any linked timer habit.
  const { data: existing, error: loadErr } = await supabase
    .from('focus_sessions')
    .select('id, planned_minutes, linked_habit_id, ended_at')
    .eq('id', parsed.id)
    .eq('user_id', userId)
    .single();
  if (loadErr) failed('endFocusSession', loadErr);
  if (!existing) throw new Error('endFocusSession failed: session not found');

  // Idempotent — if already ended, just return.
  if (existing.ended_at) return existing;

  const endedAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('focus_sessions')
    .update({ ended_at: endedAt, completed: parsed.completed })
    .eq('id', parsed.id)
    .eq('user_id', userId);
  if (updErr) failed('endFocusSession', updErr);

  try {
    // Habit kind and timezone are independent; load both in the same wave.
    if (parsed.completed && existing.linked_habit_id) {
      const [{ data: habit }, { data: profile }] = await Promise.all([
        supabase
          .from('habits')
          .select('kind')
          .eq('id', existing.linked_habit_id)
          .eq('user_id', userId)
          .single(),
        supabase
          .from('profiles')
          .select('timezone')
          .eq('id', userId)
          .single(),
      ]);
      if ((habit as { kind?: string } | null)?.kind === 'timer') {
        const tz =
          (profile as { timezone?: string } | null)?.timezone ?? 'UTC';
        const valueSeconds = existing.planned_minutes * 60;
        const { error: logErr } = await supabase.from('habit_logs').insert({
          user_id: userId,
          habit_id: existing.linked_habit_id,
          logged_at: endedAt,
          log_date: toUserDate(endedAt, tz),
          value: valueSeconds,
          note: 'auto: focus session',
        });
        if (logErr) failed('endFocusSession habit log', logErr);
      }
    }
  } finally {
    // The session update already committed, even if the follow-up log fails.
    invalidateUserData(userId, 'focus_sessions', 'habit_logs');
  }

  return { id: parsed.id, ended_at: endedAt, completed: parsed.completed };
}
