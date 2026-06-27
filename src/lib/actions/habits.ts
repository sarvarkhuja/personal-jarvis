'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return { supabase, user };
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
  const { supabase, user } = await authedClient();

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
      user_id: user.id,
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
  revalidatePath('/habits');
  revalidatePath('/today');
  revalidatePath('/');
  return data;
}

export async function updateHabit(input: UpdateHabitInput) {
  const parsed = UpdateHabitSchema.parse(input);
  const { supabase, user } = await authedClient();

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
        .eq('user_id', user.id)
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
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/habits');
  revalidatePath('/today');
  revalidatePath('/');
  return data;
}

export async function deleteHabit(input: DeleteHabitInput) {
  const parsed = DeleteHabitSchema.parse(input);
  const { supabase, user } = await authedClient();

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[deleteHabit] supabase delete failed:', error);
    throw new Error(
      `deleteHabit failed: ${error.message}${error.details ? ` (${error.details})` : ''}`,
    );
  }
  revalidatePath('/habits');
  revalidatePath('/today');
  revalidatePath('/');
}

export async function archiveHabit(input: ArchiveHabitInput) {
  const parsed = ArchiveHabitSchema.parse(input);
  const { supabase, user } = await authedClient();

  const { error } = await supabase
    .from('habits')
    .update({
      archived_at: parsed.archive ? new Date().toISOString() : null,
      is_active: !parsed.archive,
    })
    .eq('id', parsed.id)
    .eq('user_id', user.id);

  if (error) throw error;
  revalidatePath('/habits');
  revalidatePath('/today');
  revalidatePath('/');
}

export async function logHabit(input: LogHabitInput) {
  const parsed = LogHabitSchema.parse(input);
  const { supabase, user } = await authedClient();

  const tz = await getUserTimezone(supabase, user.id);
  const loggedAtIso = parsed.logged_at ?? new Date().toISOString();
  const log_date = toUserDate(loggedAtIso, tz);

  // `check` habits are binary per day, so an accidental double-tap must not
  // insert a duplicate row. `counter` (+1) and `timer` (one row per focus
  // session) legitimately log multiple times a day — only short-circuit check.
  const { data: habit } = await supabase
    .from('habits')
    .select('kind')
    .eq('id', parsed.habit_id)
    .eq('user_id', user.id)
    .single();
  if ((habit as { kind?: string } | null)?.kind === 'check') {
    const { data: existing } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('habit_id', parsed.habit_id)
      .eq('log_date', log_date)
      .limit(1)
      .maybeSingle();
    if (existing) {
      revalidatePath('/habits');
      revalidatePath('/today');
      revalidatePath('/');
      return existing;
    }
  }

  const { data, error } = await supabase
    .from('habit_logs')
    .insert({
      user_id: user.id,
      habit_id: parsed.habit_id,
      logged_at: loggedAtIso,
      log_date,
      value: parsed.value,
      note: parsed.note ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/habits');
  revalidatePath('/today');
  revalidatePath('/');
  return data;
}

export async function unlogHabit(input: UnlogHabitInput) {
  const parsed = UnlogHabitSchema.parse(input);
  const { supabase, user } = await authedClient();

  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('id', parsed.log_id)
    .eq('user_id', user.id);

  if (error) throw error;
  revalidatePath('/habits');
  revalidatePath('/today');
  revalidatePath('/');
}
