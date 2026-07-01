import { describe, expect, it } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import {
  TASHKENT_DEFAULT,
  prayerTimesForDay,
} from '@/lib/domain/salah';

const TZ = 'Asia/Tashkent';

/** Absolute minute-of-day for an instant, rendered in tz. */
function minsInTz(d: Date): number {
  const [h, m] = formatInTimeZone(d, TZ, 'HH:mm').split(':').map(Number);
  return h * 60 + m;
}
/** Assert an instant renders within `tol` minutes of an 'HH:mm' target. */
function assertClose(d: Date, target: string, tol = 3) {
  const [th, tm] = target.split(':').map(Number);
  expect(Math.abs(minsInTz(d) - (th * 60 + tm))).toBeLessThanOrEqual(tol);
}

describe('prayerTimesForDay — Tashkent Muftiyat fixtures', () => {
  // Official islom.uz Fajr/Isha, reproduced by 15.5°/15.5° + Hanafi + Maghrib+3.
  const cases: Array<[string, string, string]> = [
    ['2026-07-01', '03:09', '21:45'],
    ['2026-03-21', '05:06', '19:55'],
    ['2026-06-21', '03:04', '21:46'],
    ['2026-09-23', '04:52', '19:38'],
    ['2026-12-21', '06:19', '18:23'],
  ];
  it.each(cases)('%s → Fajr %s / Isha %s (±3m)', (date, fajr, isha) => {
    const t = prayerTimesForDay(date, TASHKENT_DEFAULT);
    assertClose(t.fajr, fajr);
    assertClose(t.isha, isha);
  });
});

describe('prayerTimesForDay — madhab and offsets', () => {
  it('Hanafi Asr is later than Shafi Asr', () => {
    const hanafi = prayerTimesForDay('2026-07-01', TASHKENT_DEFAULT);
    const shafi = prayerTimesForDay('2026-07-01', {
      ...TASHKENT_DEFAULT,
      madhab: 'shafi',
    });
    expect(hanafi.asr.getTime()).toBeGreaterThan(shafi.asr.getTime());
  });

  it('maghrib offset shifts maghrib by exactly the configured minutes', () => {
    const withOffset = prayerTimesForDay('2026-07-01', TASHKENT_DEFAULT); // +3
    const noOffset = prayerTimesForDay('2026-07-01', {
      ...TASHKENT_DEFAULT,
      offsets: { ...TASHKENT_DEFAULT.offsets, maghrib: 0 },
    });
    const diffMin =
      (withOffset.maghrib.getTime() - noOffset.maghrib.getTime()) / 60000;
    expect(diffMin).toBe(3);
  });

  it('returns all five prayers as Date instants', () => {
    const t = prayerTimesForDay('2026-07-01', TASHKENT_DEFAULT);
    for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      expect(t[p]).toBeInstanceOf(Date);
    }
  });
});
