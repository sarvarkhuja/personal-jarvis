import { describe, expect, it } from 'vitest';
import {
  formatMinutes,
  monthSpendSummary,
  pillWeekAdherence,
} from '../home-overview';

describe('formatMinutes', () => {
  it('formats sub-hour, hour, and hour+min', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(80)).toBe('1h 20m');
    expect(formatMinutes(380)).toBe('6h 20m');
  });
  it('rounds and floors negatives to 0m', () => {
    expect(formatMinutes(59.6)).toBe('1h');
    expect(formatMinutes(-5)).toBe('0m');
  });
});

describe('monthSpendSummary', () => {
  const today = '2026-06-27';
  it('totals the current month and the delta vs previous month', () => {
    const s = monthSpendSummary(
      [
        { date: '2026-06-10', amount: 100 },
        { date: '2026-06-20', amount: 50 },
        { date: '2026-05-15', amount: 200 },
      ],
      today,
    );
    expect(s.thisMonthTotal).toBe(150);
    expect(s.prevMonthTotal).toBe(200);
    expect(s.delta).toBe(-50);
    expect(s.monthLabel).toBe('JUN');
  });
  it('returns a 6-month ascending trend flagging the current month', () => {
    const s = monthSpendSummary([{ date: '2026-06-10', amount: 100 }], today);
    expect(s.trend).toHaveLength(6);
    expect(s.trend[s.trend.length - 1]).toMatchObject({ key: '2026-06', isCurrent: true });
    expect(s.trend[s.trend.length - 1].total).toBe(100);
    expect(s.trend.filter((t) => t.isCurrent)).toHaveLength(1);
  });
  it('handles the January previous-month rollover', () => {
    const s = monthSpendSummary(
      [
        { date: '2026-01-05', amount: 10 },
        { date: '2025-12-31', amount: 40 },
      ],
      '2026-01-15',
    );
    expect(s.thisMonthTotal).toBe(10);
    expect(s.prevMonthTotal).toBe(40);
    expect(s.delta).toBe(-30);
    expect(s.monthLabel).toBe('JAN');
  });
  it('returns zeros for no expenses', () => {
    const s = monthSpendSummary([], today);
    expect(s.thisMonthTotal).toBe(0);
    expect(s.prevMonthTotal).toBe(0);
    expect(s.delta).toBe(0);
  });
});

describe('pillWeekAdherence', () => {
  const today = '2026-06-27';
  const meds = [{ id: 'a' }, { id: 'b' }];
  it('counts today taken vs total and builds a 7-day window ending today', () => {
    const a = pillWeekAdherence(
      meds,
      [
        { medication_id: 'a', log_date: today },
        { medication_id: 'b', log_date: '2026-06-26' },
      ],
      today,
    );
    expect(a.total).toBe(2);
    expect(a.takenToday).toBe(1);
    expect(a.week).toHaveLength(7);
    expect(a.week[6]).toMatchObject({ date: today, taken: 1, total: 2, isToday: true });
    expect(a.week[5]).toMatchObject({ date: '2026-06-26', taken: 1, total: 2, isToday: false });
  });
  it('dedupes duplicate logs for the same med+date (multiplicity)', () => {
    const a = pillWeekAdherence(
      meds,
      [
        { medication_id: 'a', log_date: today },
        { medication_id: 'a', log_date: today },
      ],
      today,
    );
    expect(a.takenToday).toBe(1);
  });
  it('returns total 0 when there are no medications', () => {
    const a = pillWeekAdherence([], [], today);
    expect(a.total).toBe(0);
    expect(a.takenToday).toBe(0);
    expect(a.week).toHaveLength(7);
  });
});
