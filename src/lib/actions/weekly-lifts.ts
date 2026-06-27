'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import {
  DeleteWeeklyLiftSchema,
  UpsertWeeklyLiftSchema,
  type DeleteWeeklyLiftInput,
  type UpsertWeeklyLiftInput,
} from '@/lib/schemas/weekly-lifts';

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

export async function upsertWeeklyLift(input: UpsertWeeklyLiftInput) {
  const parsed = UpsertWeeklyLiftSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('weekly_lifts')
    .upsert(
      {
        user_id: userId,
        exercise: parsed.exercise,
        week_start: parsed.week_start,
        weight_kg: parsed.weight_kg ?? null,
        reps: parsed.reps,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,exercise,week_start' },
    )
    .select()
    .single();

  if (error) failed('upsertWeeklyLift', error);
  revalidatePath('/workout');
  return data;
}

export async function deleteWeeklyLift(input: DeleteWeeklyLiftInput) {
  const parsed = DeleteWeeklyLiftSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('weekly_lifts')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('deleteWeeklyLift', error);
  revalidatePath('/workout');
}
