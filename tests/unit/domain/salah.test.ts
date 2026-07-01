import { describe, expect, it } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import {
  TASHKENT_DEFAULT,
  prayerTimesForDay,
  prayerWindowsForDay,
  classifyLog,
  isMissed,
  type PrayerWindow,
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

describe('prayerWindowsForDay', () => {
  it('windows are contiguous; isha ends at tomorrow fajr', () => {
    const w = prayerWindowsForDay('2026-07-01', TASHKENT_DEFAULT);
    expect(w.fajr.end.getTime()).toBe(w.dhuhr.start.getTime());
    expect(w.dhuhr.end.getTime()).toBe(w.asr.start.getTime());
    expect(w.asr.end.getTime()).toBe(w.maghrib.start.getTime());
    expect(w.maghrib.end.getTime()).toBe(w.isha.start.getTime());
    const tomorrowFajr = prayerTimesForDay('2026-07-02', TASHKENT_DEFAULT).fajr;
    expect(w.isha.end.getTime()).toBe(tomorrowFajr.getTime());
  });
});

describe('classifyLog / isMissed', () => {
  const w: PrayerWindow = {
    start: new Date('2026-07-01T00:00:00Z'),
    end: new Date('2026-07-01T03:00:00Z'), // 3h window; late threshold at 2h (2/3)
  };
  const f = 2 / 3;

  it('first two-thirds of the window is on_time', () => {
    expect(classifyLog(new Date('2026-07-01T00:30:00Z'), w, f)).toBe('on_time');
    expect(classifyLog(new Date('2026-07-01T01:59:00Z'), w, f)).toBe('on_time');
  });
  it('last third of the window is late', () => {
    expect(classifyLog(new Date('2026-07-01T02:00:00Z'), w, f)).toBe('late');
    expect(classifyLog(new Date('2026-07-01T02:59:00Z'), w, f)).toBe('late');
  });
  it('at/after end, or before start, is qada', () => {
    expect(classifyLog(new Date('2026-07-01T03:00:00Z'), w, f)).toBe('qada');
    expect(classifyLog(new Date('2026-06-30T23:59:00Z'), w, f)).toBe('qada');
  });
  it('isMissed only when no log and the window has fully passed', () => {
    expect(isMissed(new Date('2026-07-01T03:00:00Z'), w, false)).toBe(true);
    expect(isMissed(new Date('2026-07-01T03:00:00Z'), w, true)).toBe(false);
    expect(isMissed(new Date('2026-07-01T02:59:00Z'), w, false)).toBe(false);
  });
});
