import { z } from 'zod';

export const SetThemeSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
});
export type SetThemeInput = z.infer<typeof SetThemeSchema>;
