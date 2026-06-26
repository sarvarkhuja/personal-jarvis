import { describe, expect, it } from 'vitest';
import { buildPillWeek, medicationGridRows } from '../pill-grid';

describe('buildPillWeek', () => {
  it('returns 7 days ending on today, today rightmost', () => {
    const week = buildPillWeek('2026-06-27');
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.date)).toEqual([
      '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24',
      '2026-06-25', '2026-06-26', '2026-06-27',
    ]);
    expect(week[6].isToday).toBe(true);
    expect(week.slice(0, 6).every((d) => !d.isToday)).toBe(true);
  });

  it('labels ISO weekdays Monday-first', () => {
    // 2026-06-27 is a Saturday; 2026-06-21 is a Sunday.
    const week = buildPillWeek('2026-06-27');
    expect(week[6].isoWeekday).toBe(6);
    expect(week[6].label).toBe('Sa');
    expect(week[0].isoWeekday).toBe(7);
    expect(week[0].label).toBe('Su');
  });

  it('crosses month boundaries correctly', () => {
    const week = buildPillWeek('2026-07-01');
    expect(week.map((d) => d.date)).toEqual([
      '2026-06-25', '2026-06-26', '2026-06-27', '2026-06-28',
      '2026-06-29', '2026-06-30', '2026-07-01',
    ]);
  });
});

describe('medicationGridRows', () => {
  const week = buildPillWeek('2026-06-27');

  it('marks a cell checked when a log exists for that med+date', () => {
    const rows = medicationGridRows(
      [{ id: 'm1', name: 'Vitamin D' }],
      [{ medication_id: 'm1', log_date: '2026-06-27' }],
      week,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cells.find((c) => c.date === '2026-06-27')?.checked).toBe(true);
    expect(rows[0].cells.filter((c) => c.checked)).toHaveLength(1);
  });

  it('leaves cells unchecked with no logs and keeps meds independent', () => {
    const rows = medicationGridRows(
      [{ id: 'm1', name: 'A' }, { id: 'm2', name: 'B' }],
      [{ medication_id: 'm1', log_date: '2026-06-26' }],
      week,
    );
    expect(rows[0].cells.find((c) => c.date === '2026-06-26')?.checked).toBe(true);
    expect(rows[1].cells.every((c) => !c.checked)).toBe(true);
  });
});
