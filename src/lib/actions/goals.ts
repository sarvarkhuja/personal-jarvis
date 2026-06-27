'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import {
  AddSubGoalSchema,
  CreateGoalSchema,
  DeleteGoalSchema,
  LinkGoalToHabitSchema,
  SetGoalStatusSchema,
  UpdateGoalSchema,
  type AddSubGoalInput,
  type CreateGoalInput,
  type DeleteGoalInput,
  type LinkGoalToHabitInput,
  type SetGoalStatusInput,
  type UpdateGoalInput,
} from '@/lib/schemas/goals';

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

export async function createGoal(input: CreateGoalInput) {
  const parsed = CreateGoalSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title: parsed.title,
      description: parsed.description ?? null,
      target_date: parsed.target_date ?? null,
      parent_goal_id: parsed.parent_goal_id ?? null,
      linked_habit_id: parsed.linked_habit_id ?? null,
      status: 'active',
    })
    .select()
    .single();

  if (error) failed('createGoal', error);
  revalidatePath('/goals');
  revalidatePath('/today');
  revalidatePath('/');
  return data;
}

export async function updateGoal(input: UpdateGoalInput) {
  const parsed = UpdateGoalSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const patch: Record<string, unknown> = {};
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.target_date !== undefined) patch.target_date = parsed.target_date;
  if (parsed.parent_goal_id !== undefined) patch.parent_goal_id = parsed.parent_goal_id;
  if (parsed.linked_habit_id !== undefined) patch.linked_habit_id = parsed.linked_habit_id;

  const { data, error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', parsed.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) failed('updateGoal', error);
  revalidatePath('/goals');
  revalidatePath('/today');
  revalidatePath('/');
  return data;
}

export async function setGoalStatus(input: SetGoalStatusInput) {
  const parsed = SetGoalStatusSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('goals')
    .update({ status: parsed.status })
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('setGoalStatus', error);
  revalidatePath('/goals');
  revalidatePath('/today');
  revalidatePath('/');
}

export async function linkGoalToHabit(input: LinkGoalToHabitInput) {
  const parsed = LinkGoalToHabitSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('goals')
    .update({ linked_habit_id: parsed.habit_id })
    .eq('id', parsed.goal_id)
    .eq('user_id', userId);

  if (error) failed('linkGoalToHabit', error);
  revalidatePath('/goals');
  revalidatePath('/today');
  revalidatePath('/');
}

export async function addSubGoal(input: AddSubGoalInput) {
  const parsed = AddSubGoalSchema.parse(input);
  return createGoal(parsed);
}

export async function deleteGoal(input: DeleteGoalInput) {
  const parsed = DeleteGoalSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('deleteGoal', error);
  revalidatePath('/goals');
  revalidatePath('/today');
  revalidatePath('/');
}
