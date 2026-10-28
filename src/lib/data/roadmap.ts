import type { SupabaseClient } from '@supabase/supabase-js';
import { itemHash, itemText, type ItemStatus, type Track } from '@/lib/domain/roadmap';
import type { RoadmapNote } from '@/lib/domain/roadmap-library';
import type { CreateRoadmapNoteInput } from '@/lib/schemas/roadmap';
import { CreateRoadmapNoteSchema } from '@/lib/schemas/roadmap';

/** Accepts the user-session client or the service-role client; every query filters user_id. */
export async function loadStatuses(sb: SupabaseClient, userId: string): Promise<ItemStatus[]> {
  const { data, error } = await sb
    .from('roadmap_item_status')
    .select('week, track, status, item_hash, updated_at')
    .eq('user_id', userId);
  if (error) throw new Error(`loadStatuses: ${error.message}`);
  return (data ?? []) as ItemStatus[];
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

/** Upserts a done/skipped status, or clears the row when status is null. The hash is always computed here. */
export async function writeItemStatus(
  sb: SupabaseClient,
  userId: string,
  week: number,
  track: Track,
  status: 'done' | 'skipped' | null,
): Promise<{ error?: string }> {
  if (status === null) {
    const { error } = await sb
      .from('roadmap_item_status')
      .delete()
      .eq('user_id', userId)
      .eq('week', week)
      .eq('track', track);
    return error ? { error: error.message } : {};
  }
  const { error } = await sb.from('roadmap_item_status').upsert(
    {
      user_id: userId,
      week,
      track,
      status,
      item_hash: itemHash(itemText(week, track)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week,track' },
  );
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
