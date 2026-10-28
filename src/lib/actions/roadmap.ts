'use server';

import { z } from 'zod';
import { invalidateUserData } from '@/lib/data/invalidate';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import { insertNote, writeItemStatus } from '@/lib/data/roadmap';
import type { Track } from '@/lib/domain/roadmap';
import {
  CreateRoadmapNoteSchema,
  ItemStatusInputSchema,
  UpdateRoadmapNoteSchema,
  type CreateRoadmapNoteInput,
  type UpdateRoadmapNoteInput,
} from '@/lib/schemas/roadmap';

type Result = { success: true } | { error: string };

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Check the note and try again.';
}

export async function setItemStatus(week: number, track: Track, status: 'done' | 'skipped' | null): Promise<Result> {
  const userId = await requireUserId();
  const parsed = ItemStatusInputSchema.safeParse({ week, track, status });
  if (!parsed.success) return { error: 'Unknown roadmap item.' };
  const supabase = await createClient();
  const { error } = await writeItemStatus(supabase, userId, parsed.data.week, parsed.data.track, parsed.data.status);
  if (error) {
    console.error('[setItemStatus]', error);
    return { error: 'Could not save. Try again.' };
  }
  invalidateUserData(userId, 'roadmap_item_status');
  return { success: true };
}

export async function createRoadmapNote(input: CreateRoadmapNoteInput): Promise<{ success: true; id: string } | { error: string }> {
  const userId = await requireUserId();
  const parsed = CreateRoadmapNoteSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const result = await insertNote(supabase, userId, parsed.data);
  if ('error' in result) {
    console.error('[createRoadmapNote]', result.error);
    return { error: 'Could not save the note. Try again.' };
  }
  invalidateUserData(userId, 'roadmap_notes');
  return { success: true, id: result.id };
}

export async function updateRoadmapNote(input: UpdateRoadmapNoteInput): Promise<Result> {
  const userId = await requireUserId();
  const parsed = UpdateRoadmapNoteSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from('roadmap_notes')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single();
  if (error) {
    console.error('[updateRoadmapNote]', error);
    return { error: 'Could not save. Try again.' };
  }
  invalidateUserData(userId, 'roadmap_notes');
  return { success: true };
}

export async function deleteRoadmapNote(id: string): Promise<Result> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(id).success) return { error: 'Unknown note.' };
  const supabase = await createClient();
  const { error } = await supabase.from('roadmap_notes').delete().eq('id', id).eq('user_id', userId).select('id').single();
  if (error) {
    console.error('[deleteRoadmapNote]', error);
    return { error: 'Could not delete. Try again.' };
  }
  invalidateUserData(userId, 'roadmap_notes');
  return { success: true };
}
