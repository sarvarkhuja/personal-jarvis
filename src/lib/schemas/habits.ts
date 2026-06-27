import { z } from 'zod';

export const FrequencyJsonSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('daily') }),
  z.object({
    type: z.literal('weekly'),
    days: z.array(z.number().int().min(1).max(7)).min(1),
  }),
  z.object({
    type: z.literal('x_per_week'),
    count: z.number().int().min(1).max(7),
  }),
]);
export type FrequencyJson = z.infer<typeof FrequencyJsonSchema>;

export const HabitKindSchema = z.enum(['check', 'counter', 'timer']);
export type HabitKind = z.infer<typeof HabitKindSchema>;

export const ScheduledTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour)');

export const CreateHabitFields = z.object({
  name: z.string().min(1).max(80),
  goal_id: z.string().uuid(),
  kind: HabitKindSchema,
  target: z.number().positive().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  frequency: FrequencyJsonSchema.default({ type: 'daily' }),
  color: z.string().min(1).max(20).default('gray'),
  scheduled_time: ScheduledTimeSchema.nullable().optional(),
});

export const CreateHabitSchema = CreateHabitFields.refine(
  (d) => d.scheduled_time == null || d.kind === 'timer',
  {
    message: 'Only timer habits can have a scheduled time',
    path: ['scheduled_time'],
  },
);
export type CreateHabitInput = z.infer<typeof CreateHabitSchema>;

export const UpdateHabitSchema = CreateHabitFields.partial().extend({
  id: z.string().uuid(),
});
export type UpdateHabitInput = z.infer<typeof UpdateHabitSchema>;

export const LogHabitSchema = z.object({
  habit_id: z.string().uuid(),
  value: z.number().positive().default(1),
  note: z.string().max(280).optional(),
  logged_at: z.string().datetime().optional(), // ISO; defaults to server now()
});
export type LogHabitInput = z.infer<typeof LogHabitSchema>;

export const UnlogHabitSchema = z.object({
  log_id: z.string().uuid(),
});
export type UnlogHabitInput = z.infer<typeof UnlogHabitSchema>;

export const ArchiveHabitSchema = z.object({
  id: z.string().uuid(),
  archive: z.boolean().default(true),
});
export type ArchiveHabitInput = z.infer<typeof ArchiveHabitSchema>;

export const DeleteHabitSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteHabitInput = z.infer<typeof DeleteHabitSchema>;
