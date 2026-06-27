import { z } from 'zod'
import { LIFT_KEYS } from '@/lib/utils/lift-metrics'

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
const optionalNumber = z
  .union([z.number().nonnegative(), z.null()])
  .optional()
  .nullable()

export const LiftKeySchema = z.enum(LIFT_KEYS)

export const UpsertWeeklyLiftSchema = z.object({
  exercise: LiftKeySchema,
  week_start: dateString,
  weight_kg: optionalNumber,
  reps: z.number().int().nonnegative(),
})
export type UpsertWeeklyLiftInput = z.infer<typeof UpsertWeeklyLiftSchema>

export const DeleteWeeklyLiftSchema = z.object({ id: z.string().uuid() })
export type DeleteWeeklyLiftInput = z.infer<typeof DeleteWeeklyLiftSchema>
