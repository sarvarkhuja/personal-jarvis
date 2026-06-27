import { z } from 'zod';

export const GoalStatusSchema = z.enum([
  'active',
  'done',
  'abandoned',
  'completed',
  'paused',
]);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const CreateGoalSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1000).nullable().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  parent_goal_id: z.string().uuid().nullable().optional(),
  linked_habit_id: z.string().uuid().nullable().optional(),
});
export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;

export const UpdateGoalSchema = CreateGoalSchema.partial().extend({
  id: z.string().uuid(),
});
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;

export const SetGoalStatusSchema = z.object({
  id: z.string().uuid(),
  status: GoalStatusSchema,
});
export type SetGoalStatusInput = z.infer<typeof SetGoalStatusSchema>;

export const LinkGoalToHabitSchema = z.object({
  goal_id: z.string().uuid(),
  habit_id: z.string().uuid().nullable(),
});
export type LinkGoalToHabitInput = z.infer<typeof LinkGoalToHabitSchema>;

export const AddSubGoalSchema = CreateGoalSchema.extend({
  parent_goal_id: z.string().uuid(),
});
export type AddSubGoalInput = z.infer<typeof AddSubGoalSchema>;

export const DeleteGoalSchema = z.object({ id: z.string().uuid() });
export type DeleteGoalInput = z.infer<typeof DeleteGoalSchema>;
