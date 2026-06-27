'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import {
  DeleteBodyMetricsSchema,
  UpsertBodyMetricsSchema,
  type DeleteBodyMetricsInput,
  type UpsertBodyMetricsInput,
} from '@/lib/schemas/body-metrics';

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

export async function upsertBodyMetrics(input: UpsertBodyMetricsInput) {
  const parsed = UpsertBodyMetricsSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('body_metrics')
    .upsert(
      {
        user_id: userId,
        date: parsed.date,
        weight_kg: parsed.weight_kg ?? null,
        waist_cm: parsed.waist_cm ?? null,
        arm_cm: parsed.arm_cm ?? null,
        leg_cm: parsed.leg_cm ?? null,
        forearm_cm: parsed.forearm_cm ?? null,
        calf_cm: parsed.calf_cm ?? null,
        notes: parsed.notes ?? null,
      },
      { onConflict: 'user_id,date' },
    )
    .select()
    .single();

  if (error) failed('upsertBodyMetrics', error);
  revalidatePath('/workout');
  return data;
}

export async function deleteBodyMetrics(input: DeleteBodyMetricsInput) {
  const parsed = DeleteBodyMetricsSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('body_metrics')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('deleteBodyMetrics', error);
  revalidatePath('/workout');
}
