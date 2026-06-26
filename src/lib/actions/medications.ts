'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import {
  ArchiveMedicationSchema,
  CreateMedicationSchema,
  DeleteMedicationSchema,
  LogDoseSchema,
  RefillSchema,
  SkipDoseSchema,
  ToggleMedicationSchema,
  type ArchiveMedicationInput,
  type CreateMedicationInput,
  type DeleteMedicationInput,
  type LogDoseInput,
  type RefillInput,
  type SkipDoseInput,
  type ToggleMedicationInput,
} from '@/lib/schemas/medications';

async function authedClient() {
  const userId = await requireUserId();
  const supabase = await createClient();
  return { supabase, userId };
}

async function getUserTimezone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  return (data as { timezone?: string } | null)?.timezone ?? 'UTC';
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

async function writeDoseLog(opts: {
  medicationId: string;
  userId: string;
  scheduledTime?: string;
  takenAtIso: string;
  skipped: boolean;
  note?: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const tz = await getUserTimezone(opts.supabase, opts.userId);
  const log_date = toUserDate(opts.takenAtIso, tz);

  const { data, error } = await opts.supabase
    .from('medication_logs')
    .insert({
      user_id: opts.userId,
      medication_id: opts.medicationId,
      taken_at: opts.takenAtIso,
      log_date,
      scheduled_time: opts.scheduledTime ?? null,
      skipped: opts.skipped,
      note: opts.note ?? null,
    })
    .select()
    .single();

  if (error) failed(opts.skipped ? 'skipDose' : 'logDose', error);
  return data;
}

export async function logDose(input: LogDoseInput) {
  const parsed = LogDoseSchema.parse(input);
  const { supabase, userId } = await authedClient();
  const result = await writeDoseLog({
    medicationId: parsed.medication_id,
    userId,
    scheduledTime: parsed.scheduled_time,
    takenAtIso: parsed.taken_at ?? new Date().toISOString(),
    skipped: false,
    note: parsed.note,
    supabase,
  });

  // Decrement supply_count if tracked.
  const { data: med } = await supabase
    .from('medications')
    .select('supply_count')
    .eq('id', parsed.medication_id)
    .eq('user_id', userId)
    .single();
  const supply = (med as { supply_count: number | null } | null)?.supply_count;
  if (typeof supply === 'number' && supply > 0) {
    await supabase
      .from('medications')
      .update({ supply_count: supply - 1 })
      .eq('id', parsed.medication_id)
      .eq('user_id', userId);
  }

  revalidatePath('/pills');
  revalidatePath('/today');
  return result;
}

export async function skipDose(input: SkipDoseInput) {
  const parsed = SkipDoseSchema.parse(input);
  const { supabase, userId } = await authedClient();
  const result = await writeDoseLog({
    medicationId: parsed.medication_id,
    userId,
    scheduledTime: parsed.scheduled_time,
    takenAtIso: new Date().toISOString(),
    skipped: true,
    note: parsed.note,
    supabase,
  });
  revalidatePath('/pills');
  revalidatePath('/today');
  return result;
}

export async function refill(input: RefillInput) {
  const parsed = RefillSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('medications')
    .update({ supply_count: parsed.supply_count })
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('refill', error);
  revalidatePath('/pills');
  revalidatePath('/today');
}
