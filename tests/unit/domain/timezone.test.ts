import { describe, expect, it } from 'vitest';
import { toUserDate, userDayBounds } from '@/lib/domain/timezone';

describe('toUserDate', () => {
  it('returns the local calendar date for UTC instants', () => {
    // 2026-04-25 23:30 UTC → 04:30 next day in Asia/Tashkent (+05)
    expect(toUserDate('2026-04-25T23:30:00Z', 'Asia/Tashkent')).toBe('2026-04-26');
    // The same UTC instant is still 2026-04-25 in UTC.
    expect(toUserDate('2026-04-25T23:30:00Z', 'UTC')).toBe('2026-04-25');
  });

  it('handles US Eastern across the DST spring-forward boundary', () => {
    // 2026-03-08 06:30 UTC = 01:30 EST (winter, before spring-forward at 02:00).
    expect(toUserDate('2026-03-08T06:30:00Z', 'America/New_York')).toBe('2026-03-08');
    // 2026-03-08 07:30 UTC = 03:30 EDT (after spring-forward; clocks jumped to 03:00).
    expect(toUserDate('2026-03-08T07:30:00Z', 'America/New_York')).toBe('2026-03-08');
  });

  it('accepts Date and string equivalently', () => {
    const d = new Date('2026-04-25T01:00:00Z');
    expect(toUserDate(d, 'Asia/Tashkent')).toBe(toUserDate(d.toISOString(), 'Asia/Tashkent'));
  });
});

describe('userDayBounds', () => {
  it('brackets a UTC day correctly when tz is UTC', () => {
    const { startUtc, endUtc } = userDayBounds('2026-04-25', 'UTC');
    expect(startUtc.toISOString()).toBe('2026-04-25T00:00:00.000Z');
    expect(endUtc.toISOString()).toBe('2026-04-26T00:00:00.000Z');
  });

  it('brackets a non-UTC day in user local time', () => {
    // Asia/Tashkent is +05:00 year-round. Local midnight 2026-04-25 = 2026-04-24 19:00 UTC.
    const { startUtc, endUtc } = userDayBounds('2026-04-25', 'Asia/Tashkent');
    expect(startUtc.toISOString()).toBe('2026-04-24T19:00:00.000Z');
    expect(endUtc.toISOString()).toBe('2026-04-25T19:00:00.000Z');
  });

  it('produces a 23-hour day on the DST spring-forward day in NY', () => {
    // 2026-03-08 in America/New_York skips 02:00→03:00 local time.
    const { startUtc, endUtc } = userDayBounds('2026-03-08', 'America/New_York');
    const ms = endUtc.getTime() - startUtc.getTime();
    expect(ms).toBe(23 * 60 * 60 * 1000);
  });

  it('produces a 25-hour day on the DST fall-back day in NY', () => {
    // 2026-11-01 in America/New_York repeats 01:00→02:00 local time.
    const { startUtc, endUtc } = userDayBounds('2026-11-01', 'America/New_York');
    const ms = endUtc.getTime() - startUtc.getTime();
    expect(ms).toBe(25 * 60 * 60 * 1000);
  });
});
