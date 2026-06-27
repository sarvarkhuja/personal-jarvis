import { z } from 'zod';

export const CreateMedicationSchema = z.object({
  name: z.string().min(1).max(80),
});
export type CreateMedicationInput = z.infer<typeof CreateMedicationSchema>;

export const ArchiveMedicationSchema = z.object({
  id: z.string().uuid(),
  archive: z.boolean().default(true),
});
export type ArchiveMedicationInput = z.infer<typeof ArchiveMedicationSchema>;

export const DeleteMedicationSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteMedicationInput = z.infer<typeof DeleteMedicationSchema>;

export const ToggleMedicationSchema = z.object({
  medication_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
});
export type ToggleMedicationInput = z.infer<typeof ToggleMedicationSchema>;
