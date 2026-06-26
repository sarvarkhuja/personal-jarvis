import { z } from 'zod';

const TimeOfDay = z
  .string()
  .regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'expected HH:MM');

// Retained until Task 6 — still consumed by logDose/skipDose/refill.
export const MedicationScheduleSchema = z.object({
  times: z.array(TimeOfDay).min(1).max(8),
  days: z.union([
    z.literal('daily'),
    z.array(z.number().int().min(1).max(7)).min(1).max(7),
  ]),
});
export type MedicationScheduleInput = z.infer<typeof MedicationScheduleSchema>;

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

// Retained until Task 6 (consumed by logDose/skipDose/refill).
export const LogDoseSchema = z.object({
  medication_id: z.string().uuid(),
  scheduled_time: TimeOfDay.optional(),
  taken_at: z.string().datetime().optional(),
  note: z.string().max(280).optional(),
});
export type LogDoseInput = z.infer<typeof LogDoseSchema>;

export const SkipDoseSchema = z.object({
  medication_id: z.string().uuid(),
  scheduled_time: TimeOfDay,
  note: z.string().max(280).optional(),
});
export type SkipDoseInput = z.infer<typeof SkipDoseSchema>;

export const RefillSchema = z.object({
  id: z.string().uuid(),
  supply_count: z.number().nonnegative(),
});
export type RefillInput = z.infer<typeof RefillSchema>;
