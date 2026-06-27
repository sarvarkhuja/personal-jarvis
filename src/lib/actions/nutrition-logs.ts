'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import {
  DeleteNutritionLogSchema,
  UpsertNutritionLogSchema,
  type DeleteNutritionLogInput,
  type UpsertNutritionLogInput,
} from '@/lib/schemas/nutrition-logs';

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

export async function upsertNutritionLog(input: UpsertNutritionLogInput) {
  const parsed = UpsertNutritionLogSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('nutrition_logs')
    .upsert(
      {
        user_id: userId,
        date: parsed.date,
        calories: parsed.calories ?? null,
        protein_g: parsed.protein_g ?? null,
        carbs_g: parsed.carbs_g ?? null,
        fat_g: parsed.fat_g ?? null,
        supplements_used: parsed.supplements_used ?? [],
        notes: parsed.notes ?? null,
      },
      { onConflict: 'user_id,date' },
    )
    .select()
    .single();

  if (error) failed('upsertNutritionLog', error);
  revalidatePath('/workout');
  return data;
}

export async function deleteNutritionLog(input: DeleteNutritionLogInput) {
  const parsed = DeleteNutritionLogSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('nutrition_logs')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('deleteNutritionLog', error);
  revalidatePath('/workout');
}
