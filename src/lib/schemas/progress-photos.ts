import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const ProgressPhotoPoseSchema = z.enum([
  'front_relaxed',
  'front_flexed',
  'side',
  'back_relaxed',
  'back_flexed',
]);
export type ProgressPhotoPose = z.infer<typeof ProgressPhotoPoseSchema>;

export const UploadProgressPhotoMetaSchema = z.object({
  date: dateString,
  pose: ProgressPhotoPoseSchema,
});
export type UploadProgressPhotoMeta = z.infer<typeof UploadProgressPhotoMetaSchema>;

export const DeleteProgressPhotoSchema = z.object({ id: z.string().uuid() });
export type DeleteProgressPhotoInput = z.infer<typeof DeleteProgressPhotoSchema>;
