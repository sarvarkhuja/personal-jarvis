'use server';

import { invalidateUserData } from '@/lib/data/invalidate';
import { createClient } from '@/lib/supabase/action';
import { tryGetUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import { loadSalahConfig } from '@/lib/data/salah';
import { prayerWindowsForDay, suggestStatus } from '@/lib/domain/salah';
import {
  LogSalahSchema,
  UpdateSalahLogSchema,
  UnlogSalahSchema,
  SalahSettingsSchema,
  type LogSalahInput,
  type UpdateSalahLogInput,
  type UnlogSalahInput,
  type SalahSettingsInput,
} from '@/lib/schemas/salah';

async function authedClient() {
  const userId = await tryGetUserId();
  if (!userId) throw new Error('UNAUTHENTICATED');
  const supabase = await createClient();
  return { supabase, userId };
}

/** Log (or upsert) a prayer. log_date + status default server-side. */
export async function logSalah(input: LogSalahInput) {
  const parsed = LogSalahSchema.parse(input);
  const { supabase, userId } = await authedClient();
  const cfg = await loadSalahConfig(supabase, userId);

  const now = new Date();
  const log_date = parsed.log_date ?? toUserDate(now, cfg.timezone);

  let status = parsed.status;
  if (!status) {
    const windows = prayerWindowsForDay(log_date, cfg);
    status = suggestStatus(now, windows[parsed.prayer], cfg.lateAfterFraction);
  }

  const { data, error } = await supabase
    .from('salah_logs')
    .upsert(
      {
        user_id: userId,
        prayer: parsed.prayer,
        log_date,
        status,
        jamaat: parsed.jamaat ?? null,
        logged_at: now.toISOString(),
      },
      { onConflict: 'user_id,prayer,log_date' },
    )
    .select()
    .single();

  if (error) throw error;
  invalidateUserData(userId, 'salah_logs');
  return data;
}

/** Update an existing prayer's status and/or jamaat. */
export async function updateSalahLog(input: UpdateSalahLogInput) {
  const parsed = UpdateSalahLogSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const patch: Record<string, unknown> = {};
  if (parsed.status !== undefined) patch.status = parsed.status;
  if (parsed.jamaat !== undefined) patch.jamaat = parsed.jamaat;

  const { data, error } = await supabase
    .from('salah_logs')
    .update(patch)
    .eq('user_id', userId)
    .eq('prayer', parsed.prayer)
    .eq('log_date', parsed.log_date)
    .select()
    .single();

  if (error) throw error;
  invalidateUserData(userId, 'salah_logs');
  return data;
}

/** Remove a prayer log. */
export async function unlogSalah(input: UnlogSalahInput) {
  const parsed = UnlogSalahSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('salah_logs')
    .delete()
    .eq('user_id', userId)
    .eq('prayer', parsed.prayer)
    .eq('log_date', parsed.log_date);

  if (error) throw error;
  invalidateUserData(userId, 'salah_logs');
}

/** Upsert the user's calc settings. */
export async function updateSalahSettings(input: SalahSettingsInput) {
  const parsed = SalahSettingsSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('salah_settings')
    .upsert(
      { user_id: userId, ...parsed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (error) throw error;
  invalidateUserData(userId, 'salah_settings');
}
