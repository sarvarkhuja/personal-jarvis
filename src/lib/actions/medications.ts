'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import {
  ArchiveMedicationSchema,
  CreateMedicationSchema,
  DeleteMedicationSchema,
  ToggleMedicationSchema,
  type ArchiveMedicationInput,
  type CreateMedicationInput,
  type DeleteMedicationInput,
  type ToggleMedicationInput,
} from '@/lib/schemas/medications';

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

export async function createMedication(input: CreateMedicationInput) {
  const parsed = CreateMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('medications')
    .insert({ user_id: userId, name: parsed.name })
    .select()
    .single();

  if (error) failed('createMedication', error);
  revalidatePath('/pills');
  revalidatePath('/today');
  return data;
}

export async function archiveMedication(input: ArchiveMedicationInput) {
  const parsed = ArchiveMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('medications')
    .update({ archived_at: parsed.archive ? new Date().toISOString() : null })
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('archiveMedication', error);
  revalidatePath('/pills');
  revalidatePath('/today');
}

export async function deleteMedication(input: DeleteMedicationInput) {
  const parsed = DeleteMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('deleteMedication', error);
  revalidatePath('/pills');
  revalidatePath('/today');
}

export async function toggleMedicationCompletion(input: ToggleMedicationInput) {
  const parsed = ToggleMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase.rpc('toggle_medication_completion', {
    p_user_id: userId,
    p_medication_id: parsed.medication_id,
    p_date: parsed.date,
  });

  if (error) failed('toggleMedicationCompletion', error);
  revalidatePath('/pills');
  revalidatePath('/today');
}
