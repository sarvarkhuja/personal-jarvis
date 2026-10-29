import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgressRow } from '@/lib/domain/roadmap';
import type { RoadmapNote } from '@/lib/domain/roadmap-library';
import type { CreateRoadmapNoteInput } from '@/lib/schemas/roadmap';
import { CreateRoadmapNoteSchema } from '@/lib/schemas/roadmap';

/** Accepts the user-session client or the service-role client; every query filters user_id. */
export async function loadProgress(sb: SupabaseClient, userId: string): Promise<ProgressRow[]> {
  const { data, error } = await sb.from('roadmap_progress').select('key, done_at').eq('user_id', userId);
  if (error) throw new Error(`loadProgress: ${error.message}`);
  return (data ?? []) as ProgressRow[];
}

export async function loadNotes(sb: SupabaseClient, userId: string, opts?: { week?: number }): Promise<RoadmapNote[]> {
  let q = sb
    .from('roadmap_notes')
    .select('id, week, track, kind, confidence, body, topics, created_at, updated_at')
    .eq('user_id', userId);
  if (opts?.week !== undefined) q = q.eq('week', opts.week);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw new Error(`loadNotes: ${error.message}`);
  return (data ?? []) as RoadmapNote[];
}

/** Marks a checkpoint done (idempotent) or clears it. */
export async function writeProgress(
  sb: SupabaseClient,
  userId: string,
  key: string,
  done: boolean,
): Promise<{ error?: string }> {
  if (!done) {
    const { error } = await sb.from('roadmap_progress').delete().eq('user_id', userId).eq('key', key);
    return error ? { error: error.message } : {};
  }
  const { error } = await sb
    .from('roadmap_progress')
    .upsert({ user_id: userId, key }, { onConflict: 'user_id,key', ignoreDuplicates: true });
  return error ? { error: error.message } : {};
}

/** Inserts an already-validated note. Parses again so non-action callers get normalized topics too. */
export async function insertNote(
  sb: SupabaseClient,
  userId: string,
  input: CreateRoadmapNoteInput,
): Promise<{ id: string } | { error: string }> {
  const parsed = CreateRoadmapNoteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid note.' };
  const { data, error } = await sb
    .from('roadmap_notes')
    .insert({ ...parsed.data, track: parsed.data.track ?? null, user_id: userId })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message ?? 'Insert returned no row.' };
  return { id: (data as { id: string }).id };
}
