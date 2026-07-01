import type { SupabaseClient } from '@supabase/supabase-js';
import { TASHKENT_DEFAULT, type SalahCalcConfig } from '@/lib/domain/salah';

type SettingsRow = {
  latitude: number | string;
  longitude: number | string;
  timezone: string;
  fajr_angle: number | string;
  isha_angle: number | string;
  isha_interval: number;
  madhab: 'hanafi' | 'shafi';
  offset_fajr: number;
  offset_dhuhr: number;
  offset_asr: number;
  offset_maghrib: number;
  offset_isha: number;
  late_after_fraction: number | string;
};

/** Load a user's salah calc config, falling back to TASHKENT_DEFAULT. */
export async function loadSalahConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<SalahCalcConfig> {
  const { data } = await supabase
    .from('salah_settings')
    .select(
      'latitude, longitude, timezone, fajr_angle, isha_angle, isha_interval, madhab, offset_fajr, offset_dhuhr, offset_asr, offset_maghrib, offset_isha, late_after_fraction',
    )
    .eq('user_id', userId)
    .maybeSingle();

  const row = data as SettingsRow | null;
  if (!row) return TASHKENT_DEFAULT;

  return {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    timezone: row.timezone,
    fajrAngle: Number(row.fajr_angle),
    ishaAngle: Number(row.isha_angle),
    ishaInterval: row.isha_interval,
    madhab: row.madhab,
    offsets: {
      fajr: row.offset_fajr,
      dhuhr: row.offset_dhuhr,
      asr: row.offset_asr,
      maghrib: row.offset_maghrib,
      isha: row.offset_isha,
    },
    lateAfterFraction: Number(row.late_after_fraction),
  };
}
