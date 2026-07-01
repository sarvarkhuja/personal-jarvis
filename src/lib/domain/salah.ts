import { Coordinates, CalculationParameters, PrayerTimes, Madhab } from 'adhan';
import { addDaysISO } from '@/lib/domain/habit-consistency';

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = (typeof PRAYERS)[number];

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export type SalahStatus = 'on_time' | 'late' | 'qada';
export type JamaatKind = 'alone' | 'jamaat' | 'masjid';
export type SalahMadhab = 'hanafi' | 'shafi';

export type PrayerOffsets = {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};

export type SalahCalcConfig = {
  latitude: number;
  longitude: number;
  timezone: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaInterval: number;
  madhab: SalahMadhab;
  offsets: PrayerOffsets;
  lateAfterFraction: number; // 0..1; start of "late" as fraction of window
};

export const TASHKENT_DEFAULT: SalahCalcConfig = {
  latitude: 41.2995,
  longitude: 69.2401,
  timezone: 'Asia/Tashkent',
  fajrAngle: 15.5,
  ishaAngle: 15.5,
  ishaInterval: 0,
  madhab: 'hanafi',
  offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 3, isha: 0 },
  lateAfterFraction: 2 / 3,
};

/** adhan CalculationParameters for a config. User offsets go in `adjustments`. */
export function buildParams(cfg: SalahCalcConfig): CalculationParameters {
  const p = new CalculationParameters('Other', cfg.fajrAngle, cfg.ishaAngle);
  if (cfg.ishaInterval > 0) p.ishaInterval = cfg.ishaInterval;
  p.madhab = cfg.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  p.adjustments.fajr = cfg.offsets.fajr;
  p.adjustments.dhuhr = cfg.offsets.dhuhr;
  p.adjustments.asr = cfg.offsets.asr;
  p.adjustments.maghrib = cfg.offsets.maghrib;
  p.adjustments.isha = cfg.offsets.isha;
  return p;
}

/**
 * The five prayer START instants (absolute UTC) for a Tashkent-local calendar
 * day. adhan reads only Y/M/D from the Date via LOCAL getters, so constructing
 * `new Date(y, m-1, d)` round-trips correctly on any server timezone.
 */
export function prayerTimesForDay(
  localYmd: string,
  cfg: SalahCalcConfig,
): Record<PrayerName, Date> {
  const [y, m, d] = localYmd.split('-').map(Number);
  const coords = new Coordinates(cfg.latitude, cfg.longitude);
  const pt = new PrayerTimes(coords, new Date(y, m - 1, d), buildParams(cfg));
  return {
    fajr: pt.fajr,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}
