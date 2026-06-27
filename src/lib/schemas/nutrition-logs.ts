import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const UpsertNutritionLogSchema = z.object({
  date: dateString,
  calories: z.number().int().nonnegative().nullable().optional(),
  protein_g: z.number().nonnegative().nullable().optional(),
  carbs_g: z.number().nonnegative().nullable().optional(),
  fat_g: z.number().nonnegative().nullable().optional(),
  supplements_used: z.array(z.string().min(1).max(60)).max(20).optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type UpsertNutritionLogInput = z.infer<typeof UpsertNutritionLogSchema>;

export const DeleteNutritionLogSchema = z.object({ id: z.string().uuid() });
export type DeleteNutritionLogInput = z.infer<typeof DeleteNutritionLogSchema>;
