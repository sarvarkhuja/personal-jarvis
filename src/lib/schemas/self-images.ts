import { z } from 'zod';

export const SELF_IMAGE_PILLARS = [
  { key: 'discipline', label: 'Discipline', href: '/habits' },
  { key: 'ml', label: 'Machine learning', href: '/focus' },
  { key: 'physique', label: 'Physique', href: '/workout' },
  { key: 'salah', label: 'Salah', href: '/salah' },
  { key: 'work', label: 'Work', href: '/goals' },
] as const;

export type SelfImagePillar = (typeof SELF_IMAGE_PILLARS)[number]['key'];

export const SelfImageMonthsSchema = z.union([z.literal(2), z.literal(7), z.literal(15)]);
export type SelfImageMonths = z.infer<typeof SelfImageMonthsSchema>;

export const SelfImageItemSchema = z.object({
  months: SelfImageMonthsSchema,
  pillar: z.enum(['discipline', 'ml', 'physique', 'salah', 'work']),
  body: z.string().trim().min(1, 'Write the statement first.').max(280, 'Keep it under 280 characters.'),
});

export type SelfImageItemInput = z.infer<typeof SelfImageItemSchema>;
export type SelfImageItem = SelfImageItemInput & { id: string };
