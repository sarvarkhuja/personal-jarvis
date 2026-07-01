import { describe, expect, it } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import {
  TASHKENT_DEFAULT,
  prayerTimesForDay,
  prayerWindowsForDay,
  classifyLog,
  isMissed,
  buildDayModel,
  buildSalahConsistency,
  salahDaySummary,
  type PrayerWindow,
  type LoggedPrayer,
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

const full = (): LoggedPrayer[] =>
  (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((prayer) => ({
    prayer,
    status: 'on_time' as const,
    jamaat: 'masjid' as const,
  }));

describe('buildDayModel', () => {
  it('marks logged prayers prayed and derives states for the rest', () => {
    // 2026-07-01 13:00 UTC = 18:00 Tashkent: Fajr/Dhuhr passed, Asr around now.
    // (Dhuhr's window runs until Asr start, ~17:42 local in midsummer Tashkent,
    // so 14:00 local is too early to call Dhuhr missed — 18:00 local is not.)
    const now = new Date('2026-07-01T13:00:00Z');
    const logs: LoggedPrayer[] = [
      { prayer: 'fajr', status: 'on_time', jamaat: 'masjid' },
    ];
    const m = buildDayModel(now, TASHKENT_DEFAULT, logs);
    expect(m.date).toBe('2026-07-01');
    expect(m.cells).toHaveLength(5);
    const fajr = m.cells.find((c) => c.name === 'fajr')!;
    expect(fajr.state).toBe('prayed');
    expect(fajr.status).toBe('on_time');
    // Dhuhr window passed with no log → missed.
    expect(m.cells.find((c) => c.name === 'dhuhr')!.state).toBe('missed');
    // Isha is still upcoming this evening.
    expect(m.cells.find((c) => c.name === 'isha')!.state).toBe('upcoming');
  });

  it("labels Friday's Dhuhr as Jumu'ah", () => {
    // 2026-01-02 is a Friday.
    const fri = buildDayModel(new Date('2026-01-02T06:00:00Z'), TASHKENT_DEFAULT, []);
    expect(fri.cells.find((c) => c.name === 'dhuhr')!.label).toBe("Jumu'ah");
    // 2026-01-03 is a Saturday.
    const sat = buildDayModel(new Date('2026-01-03T06:00:00Z'), TASHKENT_DEFAULT, []);
    expect(sat.cells.find((c) => c.name === 'dhuhr')!.label).toBe('Dhuhr');
  });

  it('after Isha, next is tomorrow Fajr', () => {
    // 2026-07-01 18:00 UTC = 23:00 Tashkent, after Isha (~21:45).
    const m = buildDayModel(new Date('2026-07-01T18:00:00Z'), TASHKENT_DEFAULT, []);
    expect(m.next?.name).toBe('fajr');
    expect(m.next?.isTomorrow).toBe(true);
  });
});

describe('buildSalahConsistency', () => {
  const today = '2026-07-01';
  const now = new Date('2026-07-01T18:00:00Z'); // all of today's windows passed
  it('counts a perfect-day streak and 7-day week', () => {
    const byDate = new Map<string, LoggedPrayer[]>();
    for (const d of ['2026-06-29', '2026-06-30', '2026-07-01']) byDate.set(d, full());
    const c = buildSalahConsistency(byDate, today, now, TASHKENT_DEFAULT);
    expect(c.streakCurrent).toBe(3);
    expect(c.week).toHaveLength(7);
    expect(c.onTimeRate30d).toBe(1);
    expect(c.jamaatRate30d).toBe(1);
  });

  it('reports missed prayers for empty past days', () => {
    const c = buildSalahConsistency(new Map(), today, now, TASHKENT_DEFAULT);
    expect(c.streakCurrent).toBe(0);
    expect(c.missedCount30d).toBeGreaterThan(0);
    expect(c.qadaCount30d).toBe(0);
  });
});

describe('salahDaySummary', () => {
  it('summarizes today for the home glance', () => {
    const byDate = new Map<string, LoggedPrayer[]>([['2026-07-01', full()]]);
    const s = salahDaySummary(
      TASHKENT_DEFAULT,
      full(),
      byDate,
      new Date('2026-07-01T18:00:00Z'),
      '2026-07-01',
    );
    expect(s.prayedCount).toBe(5);
    expect(s.onTimeRate7d).toBe(1);
    expect(s.nextLabel).toBe('Fajr'); // after Isha → tomorrow Fajr
  });
});
