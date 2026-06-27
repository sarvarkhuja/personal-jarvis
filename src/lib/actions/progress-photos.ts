'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import {
  DeleteProgressPhotoSchema,
  UploadProgressPhotoMetaSchema,
  type DeleteProgressPhotoInput,
} from '@/lib/schemas/progress-photos';

const BUCKET = 'progress-photos';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

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

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/heic': return 'heic';
    case 'image/heif': return 'heif';
    default: return 'bin';
  }
}

export async function uploadProgressPhoto(formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('uploadProgressPhoto failed: file missing');
  if (file.size === 0) throw new Error('uploadProgressPhoto failed: empty file');
  if (file.size > MAX_BYTES) {
    throw new Error(`uploadProgressPhoto failed: file exceeds ${MAX_BYTES / 1024 / 1024} MB`);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`uploadProgressPhoto failed: unsupported type ${file.type}`);
  }

  const meta = UploadProgressPhotoMetaSchema.parse({
    date: formData.get('date'),
    pose: formData.get('pose'),
  });

  const { supabase, userId } = await authedClient();
  const photoId = crypto.randomUUID();
  const ext = extFromMime(file.type);
  const storagePath = `${userId}/${photoId}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) failed('uploadProgressPhoto', uploadError);

  const { error: insertError } = await supabase
    .from('progress_photos')
    .insert({
      id: photoId,
      user_id: userId,
      date: meta.date,
      pose: meta.pose,
      storage_path: storagePath,
      thumbnail_path: null,
    });

  if (insertError) {
    // Roll back the uploaded file so we don't orphan it.
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    failed('uploadProgressPhoto', insertError);
  }

  revalidatePath('/workout');
}

export async function deleteProgressPhoto(input: DeleteProgressPhotoInput) {
  const parsed = DeleteProgressPhotoSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data: row, error: lookupError } = await supabase
    .from('progress_photos')
    .select('storage_path, thumbnail_path')
    .eq('id', parsed.id)
    .eq('user_id', userId)
    .single();

  if (lookupError) failed('deleteProgressPhoto', lookupError);

  const paths = [row?.storage_path, row?.thumbnail_path].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths).catch(() => {});
  }

  const { error: deleteError } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (deleteError) failed('deleteProgressPhoto', deleteError);
  revalidatePath('/workout');
}
