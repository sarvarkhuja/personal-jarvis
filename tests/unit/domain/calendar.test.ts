import { describe, expect, it } from 'vitest';
import {
  groupByLocalDate,
  isInMonth,
  monthAnchor,
  monthGrid,
  monthLabel,
  nextMonth,
  previousMonth,
} from '@/lib/domain/calendar';

describe('monthGrid', () => {
  it('returns a 6×7 grid', () => {
    const grid = monthGrid('2026-04-01');
    expect(grid).toHaveLength(6);
    for (const row of grid) expect(row).toHaveLength(7);
  });

  it('starts on the Monday on/before the 1st of the month', () => {
    // 2026-04-01 is Wednesday. Monday on/before is 2026-03-30.
    const grid = monthGrid('2026-04-01');
    expect(grid[0][0]).toBe('2026-03-30');
    // The 1st sits at index 2 (Wed).
    expect(grid[0][2]).toBe('2026-04-01');
  });

  it('includes the last day of the month somewhere in the grid', () => {
    const grid = monthGrid('2026-02-01').flat();
    expect(grid).toContain('2026-02-28');
  });

  it('handles months that start on Monday (no leading bleed-in)', () => {
    // 2027-02-01 is Monday.
    const grid = monthGrid('2027-02-01');
    expect(grid[0][0]).toBe('2027-02-01');
  });
});

describe('isInMonth / monthAnchor / monthLabel', () => {
  it('isInMonth checks YYYY-MM equality', () => {
    expect(isInMonth('2026-04-01', '2026-04-15')).toBe(true);
    expect(isInMonth('2026-03-31', '2026-04-15')).toBe(false);
  });

  it('monthAnchor returns the first of that month UTC', () => {
    expect(monthAnchor(new Date('2026-04-25T13:00:00Z'))).toBe('2026-04-01');
  });

  it('monthLabel renders human-readable', () => {
    expect(monthLabel('2026-04-01')).toBe('April 2026');
  });
});

describe('previousMonth / nextMonth', () => {
  it('wraps across year boundaries', () => {
    expect(previousMonth('2026-01-01')).toBe('2025-12-01');
    expect(nextMonth('2026-12-01')).toBe('2027-01-01');
  });

  it('moves one month forward / backward', () => {
    expect(previousMonth('2026-04-01')).toBe('2026-03-01');
    expect(nextMonth('2026-04-01')).toBe('2026-05-01');
  });
});

describe('groupByLocalDate', () => {
  it('buckets entries by the resolver output', () => {
    const items = [
      { id: 'a', day: '2026-04-25' },
      { id: 'b', day: '2026-04-25' },
      { id: 'c', day: '2026-04-26' },
    ];
    const m = groupByLocalDate(items, (e) => e.day);
    expect(m.get('2026-04-25')!.map((x) => x.id)).toEqual(['a', 'b']);
    expect(m.get('2026-04-26')!.map((x) => x.id)).toEqual(['c']);
  });
});
