'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import { SelfImageSchema, type SelfImageInput } from '@/lib/schemas/self-images';

export async function saveSelfImage(input: SelfImageInput, id?: string) {
  const userId = await requireUserId();
  const parsed = SelfImageSchema.safeParse(input);
  if (!parsed.success || (id !== undefined && !z.uuid().safeParse(id).success)) {
    return { error: 'Check the fields and try again.' };
  }
  const supabase = await createClient();
  const result = id
    ? await supabase.from('self_images').update(parsed.data).eq('id', id).eq('user_id', userId).select('id').single()
    : await supabase.from('self_images').insert({ ...parsed.data, user_id: userId }).select('id').single();
  if (result.error) {
    console.error('[saveSelfImage]', result.error);
    return { error: 'Your vision could not be saved. Please try again.' };
  }
  revalidatePath('/');
  return { success: true };
}

export async function deleteSelfImage(id: string) {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(id).success) return { error: 'Invalid vision.' };
  const supabase = await createClient();
  const { error } = await supabase.from('self_images').delete().eq('id', id).eq('user_id', userId).select('id').single();
  if (error) {
    console.error('[deleteSelfImage]', error);
    return { error: 'Your vision could not be deleted. Please try again.' };
  }
  revalidatePath('/');
  return { success: true };
}
