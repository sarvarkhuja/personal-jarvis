import { z } from 'zod';

export const StartFocusSessionSchema = z.object({
  planned_minutes: z.number().int().min(1).max(180),
  intent: z.string().max(280).optional(),
  linked_goal_id: z.string().uuid().nullable().optional(),
  linked_habit_id: z.string().uuid().nullable().optional(),
});
export type StartFocusSessionInput = z.infer<typeof StartFocusSessionSchema>;

export const EndFocusSessionSchema = z.object({
  id: z.string().uuid(),
  completed: z.boolean(),
});
export type EndFocusSessionInput = z.infer<typeof EndFocusSessionSchema>;
