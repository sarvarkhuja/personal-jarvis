import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const optionalNumber = z
  .union([z.number().nonnegative(), z.null()])
  .optional()
  .nullable();

export const UpsertBodyMetricsSchema = z.object({
  date: dateString,
  weight_kg: optionalNumber,
  waist_cm: optionalNumber,
  arm_cm: optionalNumber,
  leg_cm: optionalNumber,
  forearm_cm: optionalNumber,
  calf_cm: optionalNumber,
  notes: z.string().max(1000).nullable().optional(),
});
export type UpsertBodyMetricsInput = z.infer<typeof UpsertBodyMetricsSchema>;

export const DeleteBodyMetricsSchema = z.object({ id: z.string().uuid() });
export type DeleteBodyMetricsInput = z.infer<typeof DeleteBodyMetricsSchema>;
