import { describe, expect, it } from 'vitest';
import { computeStreak } from '@/lib/domain/streak';

const daily = { type: 'daily' as const };
const weekdays = { type: 'weekly' as const, days: [1, 2, 3, 4, 5] };

describe('computeStreak — daily habits', () => {
  it('all-due-and-done over 5 days yields current=5, longest=5, rate=5/5', () => {
    const logs = ['2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25'];
    const r = computeStreak(logs, daily, '2026-04-25');
    expect(r.currentStreak).toBe(5);
    expect(r.longestStreak).toBe(5);
    expect(r.completionRate30d).toBeCloseTo(5 / 30);
  });

  it('all-due-and-missed yields zeros', () => {
    const r = computeStreak([], daily, '2026-04-25');
    expect(r.currentStreak).toBe(0);
    expect(r.longestStreak).toBe(0);
    expect(r.completionRate30d).toBe(0);
  });

  it('today unlogged but yesterday logged: current still counts yesterday', () => {
    // Grace period for "today" — streak shouldn't reset until the day fully passes.
    const logs = ['2026-04-23', '2026-04-24'];
    const r = computeStreak(logs, daily, '2026-04-25');
    expect(r.currentStreak).toBe(2);
  });

  it('a missed yesterday breaks the streak', () => {
    const logs = ['2026-04-22', '2026-04-25']; // gap on 23 and 24
    const r = computeStreak(logs, daily, '2026-04-25');
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(1);
  });

  it('deduplicates duplicate log dates', () => {
    const logs = ['2026-04-25', '2026-04-25', '2026-04-25'];
    const r = computeStreak(logs, daily, '2026-04-25');
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(1);
  });
});

describe('computeStreak — weekly habits', () => {
  it('non-due days do not break the streak', () => {
    // weekdays-only habit. 2026-04-25 = Sat (not due), 2026-04-24 = Fri (due).
    const logs = ['2026-04-22', '2026-04-23', '2026-04-24']; // Wed Thu Fri
    const r = computeStreak(logs, weekdays, '2026-04-25');
    expect(r.currentStreak).toBe(3);
    expect(r.longestStreak).toBe(3);
  });

  it('completion rate over 30 days only counts due days', () => {
    // Generate logs for every Mon-Fri in last 30 days starting from today.
    const today = '2026-04-25';
    const logs: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date('2026-04-25T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dow = (d.getUTCDay() + 6) % 7 + 1; // ISO 1..7
      if (dow >= 1 && dow <= 5) logs.push(iso);
    }
    const r = computeStreak(logs, weekdays, today);
    expect(r.completionRate30d).toBe(1);
  });
});
