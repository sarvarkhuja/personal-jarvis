export const USER_DATA_TABLES = [
  'profiles', 'habits', 'habit_logs', 'goals', 'expenses', 'medications',
  'medication_logs', 'events', 'focus_sessions', 'weekly_lifts', 'body_metrics',
  'progress_photos', 'nutrition_logs', 'salah_logs', 'salah_settings', 'self_image_items',
] as const;

export type UserDataTable = typeof USER_DATA_TABLES[number];

export function userDataTag(userId: string, table?: UserDataTable) {
  return `jarvis:user:${userId}${table ? `:${table}` : ''}`;
}
