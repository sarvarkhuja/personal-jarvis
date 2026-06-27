'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import {
  CreateEventSchema,
  DeleteEventSchema,
  UpdateEventSchema,
  type CreateEventInput,
  type DeleteEventInput,
  type UpdateEventInput,
} from '@/lib/schemas/events';

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

export async function createEvent(input: CreateEventInput) {
  const parsed = CreateEventSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: userId,
      title: parsed.title,
      description: parsed.description ?? null,
      starts_at: parsed.starts_at,
      ends_at: parsed.ends_at ?? null,
      kind: parsed.kind,
      linked_goal_id: parsed.linked_goal_id ?? null,
    })
    .select()
    .single();

  if (error) failed('createEvent', error);
  revalidatePath('/plans');
  revalidatePath('/today');
  return data;
}

export async function updateEvent(input: UpdateEventInput) {
  const parsed = UpdateEventSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const patch: Record<string, unknown> = {};
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.starts_at !== undefined) patch.starts_at = parsed.starts_at;
  if (parsed.ends_at !== undefined) patch.ends_at = parsed.ends_at;
  if (parsed.kind !== undefined) patch.kind = parsed.kind;
  if (parsed.linked_goal_id !== undefined)
    patch.linked_goal_id = parsed.linked_goal_id;

  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', parsed.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) failed('updateEvent', error);
  revalidatePath('/plans');
  revalidatePath('/today');
  return data;
}

export async function deleteEvent(input: DeleteEventInput) {
  const parsed = DeleteEventSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('deleteEvent', error);
  revalidatePath('/plans');
  revalidatePath('/today');
}
