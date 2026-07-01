import { z } from 'zod';

export const PrayerNameSchema = z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
export const SalahStatusSchema = z.enum(['on_time', 'late', 'qada']);
export const JamaatKindSchema = z.enum(['alone', 'jamaat', 'masjid']);

/** Log or upsert a prayer. `log_date`/`status` default server-side. */
export const LogSalahSchema = z.object({
  prayer: PrayerNameSchema,
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: SalahStatusSchema.optional(),
  jamaat: JamaatKindSchema.nullable().optional(),
});
export type LogSalahInput = z.infer<typeof LogSalahSchema>;

export const UpdateSalahLogSchema = z.object({
  prayer: PrayerNameSchema,
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: SalahStatusSchema.optional(),
  jamaat: JamaatKindSchema.nullable().optional(),
});
export type UpdateSalahLogInput = z.infer<typeof UpdateSalahLogSchema>;

export const UnlogSalahSchema = z.object({
  prayer: PrayerNameSchema,
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type UnlogSalahInput = z.infer<typeof UnlogSalahSchema>;

export const SalahSettingsSchema = z.object({
  city: z.string().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1).max(64),
  fajr_angle: z.number().min(0).max(30),
  isha_angle: z.number().min(0).max(30),
  isha_interval: z.number().int().min(0).max(180),
  madhab: z.enum(['hanafi', 'shafi']),
  offset_fajr: z.number().int().min(-60).max(60),
  offset_dhuhr: z.number().int().min(-60).max(60),
  offset_asr: z.number().int().min(-60).max(60),
  offset_maghrib: z.number().int().min(-60).max(60),
  offset_isha: z.number().int().min(-60).max(60),
  late_after_fraction: z.number().min(0).max(1),
});
export type SalahSettingsInput = z.infer<typeof SalahSettingsSchema>;
