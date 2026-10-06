'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import { SelfImageItemSchema, SelfImageMonthsSchema, type SelfImageItemInput } from '@/lib/schemas/self-images';
import { protocolItems } from '@/lib/domain/future-self';

type Result = { success: true } | { error: string };

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Check the statement and try again.';
}

export async function createSelfImageItem(input: SelfImageItemInput): Promise<Result> {
  const userId = await requireUserId();
  const parsed = SelfImageItemSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from('self_image_items').insert({ ...parsed.data, user_id: userId });
  if (error) {
    console.error('[createSelfImageItem]', error);
    return { error: 'Could not add it. Try again.' };
  }
  revalidatePath('/');
  return { success: true };
}

export async function updateSelfImageItem(id: string, body: string): Promise<Result> {
  const userId = await requireUserId();
  const parsed = SelfImageItemSchema.shape.body.safeParse(body);
  if (!z.uuid().safeParse(id).success) return { error: 'Unknown statement.' };
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from('self_image_items').update({ body: parsed.data }).eq('id', id).eq('user_id', userId).select('id').single();
  if (error) {
    console.error('[updateSelfImageItem]', error);
    return { error: 'Could not save. Try again.' };
  }
  revalidatePath('/');
  return { success: true };
}

export async function deleteSelfImageItem(id: string): Promise<Result> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(id).success) return { error: 'Unknown statement.' };
  const supabase = await createClient();
  const { error } = await supabase.from('self_image_items').delete().eq('id', id).eq('user_id', userId).select('id').single();
  if (error) {
    console.error('[deleteSelfImageItem]', error);
    return { error: 'Could not delete. Try again.' };
  }
  revalidatePath('/');
  return { success: true };
}

/** Loads the strict default list into an empty horizon. Never duplicates. */
export async function loadSelfImageProtocol(months: number): Promise<Result> {
  const userId = await requireUserId();
  const parsed = SelfImageMonthsSchema.safeParse(months);
  if (!parsed.success) return { error: 'Unknown horizon.' };
  const supabase = await createClient();
  const existing = await supabase.from('self_image_items').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('months', parsed.data);
  if (existing.error) {
    console.error('[loadSelfImageProtocol]', existing.error);
    return { error: 'Could not load the protocol. Try again.' };
  }
  if ((existing.count ?? 0) > 0) return { error: 'This horizon already has statements.' };
  const { error } = await supabase.from('self_image_items').insert(protocolItems(parsed.data).map((item) => ({ ...item, user_id: userId })));
  if (error) {
    console.error('[loadSelfImageProtocol]', error);
    return { error: 'Could not load the protocol. Try again.' };
  }
  revalidatePath('/');
  return { success: true };
}
