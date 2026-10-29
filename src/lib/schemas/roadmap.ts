import { z } from 'zod';
import { normalizeTopic } from '@/lib/domain/roadmap';

const TrackSchema = z.enum(['go', 'ai', 'ml']);
const WeekSchema = z.number().int().min(1).max(28);

export const ProgressInputSchema = z.object({
  key: z.string().min(3).max(80),
  done: z.boolean(),
});

const TopicsSchema = z.array(z.string()).transform((raw) => {
  const seen = new Set<string>();
  for (const t of raw) {
    const slug = normalizeTopic(t);
    if (slug) seen.add(slug);
  }
  return [...seen].slice(0, 8);
});

const ConfidenceSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const NoteFields = z.object({
  week: WeekSchema,
  track: TrackSchema.nullish(),
  kind: z.enum(['learning', 'question', 'gotcha', 'decision', 'resource', 'story']),
  confidence: ConfidenceSchema,
  body: z.string().trim().min(1, 'Write the note first.').max(4000, 'Keep it under 4000 characters.'),
  topics: TopicsSchema,
});

export const CreateRoadmapNoteSchema = NoteFields.extend({ confidence: ConfidenceSchema.default(2) });

export type CreateRoadmapNoteInput = z.input<typeof CreateRoadmapNoteSchema>;

// Built from the default-free fields so a partial update never resets confidence.
export const UpdateRoadmapNoteSchema = NoteFields.partial().extend({ id: z.uuid() });
export type UpdateRoadmapNoteInput = z.input<typeof UpdateRoadmapNoteSchema>;
