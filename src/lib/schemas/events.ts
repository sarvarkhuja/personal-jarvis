import { z } from 'zod';

export const EventKindSchema = z.enum(['event', 'appointment', 'milestone']);
export type EventKind = z.infer<typeof EventKindSchema>;

export const CreateEventSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().max(2000).nullable().optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime().nullable().optional(),
    kind: EventKindSchema.default('event'),
    linked_goal_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) => v.ends_at == null || new Date(v.ends_at) >= new Date(v.starts_at),
    { message: 'ends_at must be on or after starts_at', path: ['ends_at'] },
  );
export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).nullable().optional(),
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().nullable().optional(),
    kind: EventKindSchema.optional(),
    linked_goal_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) =>
      v.ends_at == null ||
      v.starts_at == null ||
      new Date(v.ends_at) >= new Date(v.starts_at),
    { message: 'ends_at must be on or after starts_at', path: ['ends_at'] },
  );
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

export const DeleteEventSchema = z.object({ id: z.string().uuid() });
export type DeleteEventInput = z.infer<typeof DeleteEventSchema>;
