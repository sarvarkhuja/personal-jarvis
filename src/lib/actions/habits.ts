'use server';

import { invalidateUserData } from '@/lib/data/invalidate';
import { createClient } from '@/lib/supabase/action';
import { tryGetUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import {
  ArchiveHabitSchema,
  CreateHabitSchema,
  DeleteHabitSchema,
  LogHabitSchema,
  UnlogHabitSchema,
  UpdateHabitSchema,
  type ArchiveHabitInput,
  type CreateHabitInput,
  type DeleteHabitInput,
  type LogHabitInput,
  type UnlogHabitInput,
  type UpdateHabitInput,
  type HabitKind,
} from '@/lib/schemas/habits';

async function authedClient() {
  const userId = await tryGetUserId();
  if (!userId) throw new Error('UNAUTHENTICATED');
  const supabase = await createClient();
  return { supabase, userId };
}

async function getUserTimezone(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  return data?.timezone ?? 'UTC';
}

export async function createHabit(input: CreateHabitInput) {
  const parsed = CreateHabitSchema.parse(input);
  const { supabase, userId } = await authedClient();

  // RLS-scoped check that the goal belongs to the calling user.
  // FK alone won't catch cross-tenant references because Postgres FKs bypass RLS.
  const { data: goalRow } = await supabase
    .from('goals')
    .select('id')
    .eq('id', parsed.goal_id)
    .maybeSingle();
  if (!goalRow) throw new Error('GOAL_NOT_FOUND');

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      goal_id: parsed.goal_id,
      name: parsed.name,
      kind: parsed.kind,
      target: parsed.target ?? null,
      unit: parsed.unit ?? null,
      frequency_json: parsed.frequency,
      color: parsed.color,
      scheduled_time:
        parsed.kind === 'timer' ? (parsed.scheduled_time ?? null) : null,
    })
    .select()
    .single();

  if (error) {
    console.error('[createHabit] supabase insert failed:', error);
    throw new Error(
      `createHabit failed: ${error.message}${error.details ? ` (${error.details})` : ''}`,
    );
  }
  invalidateUserData(userId, 'habits');
  return data;
}

export async function updateHabit(input: UpdateHabitInput) {
  const parsed = UpdateHabitSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const patch: Record<string, unknown> = {};
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.kind !== undefined) patch.kind = parsed.kind;
  if (parsed.target !== undefined) patch.target = parsed.target;
  if (parsed.unit !== undefined) patch.unit = parsed.unit;
  if (parsed.frequency !== undefined) patch.frequency_json = parsed.frequency;
  if (parsed.color !== undefined) patch.color = parsed.color;
  if (parsed.scheduled_time !== undefined) {
    let effectiveKind: HabitKind | undefined = parsed.kind;
    if (effectiveKind === undefined) {
      const { data: current } = await supabase
        .from('habits')
        .select('kind')
        .eq('id', parsed.id)
        .eq('user_id', userId)
        .single();
      effectiveKind = (current as { kind?: HabitKind } | null)?.kind;
    }
    patch.scheduled_time =
      effectiveKind === 'timer' ? parsed.scheduled_time : null;
  }

  const { data, error } = await supabase
    .from('habits')
    .update(patch)
    .eq('id', parsed.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  invalidateUserData(userId, 'habits');
  return data;
}

export async function deleteHabit(input: DeleteHabitInput) {
  const parsed = DeleteHabitSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) {
    console.error('[deleteHabit] supabase delete failed:', error);
    throw new Error(
      `deleteHabit failed: ${error.message}${error.details ? ` (${error.details})` : ''}`,
    );
  }
  // Deletion cascades to logs and clears linked goal/session references.
  invalidateUserData(userId, 'habits', 'habit_logs', 'goals', 'focus_sessions');
}

export async function archiveHabit(input: ArchiveHabitInput) {
  const parsed = ArchiveHabitSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('habits')
    .update({
      archived_at: parsed.archive ? new Date().toISOString() : null,
      is_active: !parsed.archive,
    })
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) throw error;
  invalidateUserData(userId, 'habits');
}

export async function logHabit(input: LogHabitInput) {
  const parsed = LogHabitSchema.parse(input);
  const { supabase, userId } = await authedClient();

  // `check` habits are binary per day, so an accidental double-tap must not
  // insert a duplicate row. `counter` (+1) and `timer` (one row per focus
  // session) legitimately log multiple times a day — only short-circuit check.
  const [tz, { data: habit }] = await Promise.all([
    getUserTimezone(supabase, userId),
    supabase
      .from('habits')
      .select('kind')
      .eq('id', parsed.habit_id)
      .eq('user_id', userId)
      .single(),
  ]);
  const loggedAtIso = parsed.logged_at ?? new Date().toISOString();
  const log_date = toUserDate(loggedAtIso, tz);
  if ((habit as { kind?: string } | null)?.kind === 'check') {
    const { data: existing } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', parsed.habit_id)
      .eq('log_date', log_date)
      .limit(1)
      .maybeSingle();
    if (existing) {
      invalidateUserData(userId, 'habit_logs');
      return existing;
    }
  }

  const { data, error } = await supabase
    .from('habit_logs')
    .insert({
      user_id: userId,
      habit_id: parsed.habit_id,
      logged_at: loggedAtIso,
      log_date,
      value: parsed.value,
      note: parsed.note ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  invalidateUserData(userId, 'habit_logs');
  return data;
}

export async function unlogHabit(input: UnlogHabitInput) {
  const parsed = UnlogHabitSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('id', parsed.log_id)
    .eq('user_id', userId);

  if (error) throw error;
  invalidateUserData(userId, 'habit_logs');
}
