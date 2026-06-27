import { describe, expect, it } from 'vitest';
import {
  bodyWeightSummary,
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

describe('bodyWeightSummary', () => {
  const today = '2026-06-27';

  it('returns an empty summary when there are no weigh-ins', () => {
    const s = bodyWeightSummary([], 80, today, 90);
    expect(s.latest).toBeNull();
    expect(s.latestDate).toBeNull();
    expect(s.count).toBe(0);
    expect(s.spark).toEqual([]);
    expect(s.targetY).toBeNull();
    expect(s.netDelta).toBeNull();
    expect(s.deltaToTarget).toBeNull();
    expect(s.towardTarget).toBeNull();
  });

  it('reports latest weight, distance to target, and toward-target progress', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-04-01', weight_kg: 86 },
        { date: '2026-05-01', weight_kg: 84 },
        { date: '2026-06-20', weight_kg: 82.4 },
      ],
      80,
      today,
      90,
    );
    expect(s.latest).toBe(82.4);
    expect(s.latestDate).toBe('2026-06-20');
    expect(s.target).toBe(80);
    expect(s.deltaToTarget).toBeCloseTo(2.4);
    expect(s.netDelta).toBeCloseTo(-3.6);
    expect(s.towardTarget).toBe('toward');
    expect(s.count).toBe(3);
  });

  it('flags away-from-target when latest is farther than the first weigh-in', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-06-01', weight_kg: 80.5 },
        { date: '2026-06-20', weight_kg: 82 },
      ],
      80,
      today,
      90,
    );
    expect(s.towardTarget).toBe('away');
  });

  it('ignores null weigh-ins and sorts out of order input', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-06-20', weight_kg: 82 },
        { date: '2026-06-10', weight_kg: null },
        { date: '2026-06-01', weight_kg: 84 },
      ],
      null,
      today,
      90,
    );
    expect(s.count).toBe(2);
    expect(s.latest).toBe(82);
    expect(s.netDelta).toBe(-2);
  });

  it('falls back to net delta and no target line when no target is set', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-06-01', weight_kg: 84 },
        { date: '2026-06-20', weight_kg: 82 },
      ],
      null,
      today,
      90,
    );
    expect(s.target).toBeNull();
    expect(s.deltaToTarget).toBeNull();
    expect(s.towardTarget).toBeNull();
    expect(s.netDelta).toBe(-2);
    expect(s.targetY).toBeNull();
  });

  it('handles a single weigh-in: no net delta, one spark point', () => {
    const s = bodyWeightSummary([{ date: '2026-06-20', weight_kg: 82 }], 80, today, 90);
    expect(s.count).toBe(1);
    expect(s.netDelta).toBeNull();
    expect(s.towardTarget).toBeNull();
    expect(s.spark).toHaveLength(1);
  });

  it('normalizes the sparkline within 0..100 with the latest point at x=100', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-04-01', weight_kg: 86 },
        { date: today, weight_kg: 82 },
      ],
      80,
      today,
      90,
    );
    expect(s.spark).toHaveLength(2);
    for (const p of s.spark) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
    expect(s.spark[s.spark.length - 1].x).toBeCloseTo(100);
  });
});
