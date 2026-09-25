import { describe, expect, it } from 'vitest';
import { attentionProjection, buildAttentionEvidence, horizonDate } from '../future-self';

describe('future self projections', () => {
  it('uses calendar months and clamps at month-end, including leap years', () => {
    expect(horizonDate('2026-12-31', 2)).toBe('2027-02-28');
    expect(horizonDate('2023-12-31', 2)).toBe('2024-02-29');
    expect(horizonDate('2026-09-25', 7)).toBe('2027-04-25');
    expect(horizonDate('2026-09-25', 15)).toBe('2027-12-25');
  });

  it('accounts for actual days and skipped opportunities without erasing past progress', () => {
    const result = attentionProjection('2026-09-25', 2, 60, 2);
    expect(result.days).toBe(61);
    expect(result.availableHours).toBe(61);
    expect(result.lostHours).toBeCloseTo(61 * 2 / 7);
    expect(result.keptHours + result.lostHours).toBeCloseTo(61);
    expect(attentionProjection('2026-09-25', 2, 60, 7).keptHours).toBe(0);
    expect(attentionProjection('2026-09-25', 2, 60, 0).lostHours).toBe(0);
  });

  it('keeps today separate and counts finished partial sessions without duplicate days', () => {
    const result = buildAttentionEvidence([
      { localDate: '2026-09-24', durationMin: 25, ended: true },
      { localDate: '2026-09-24', durationMin: 5, ended: true },
      { localDate: '2026-09-25', durationMin: 10, ended: true },
      { localDate: '2026-09-23', durationMin: 25, ended: false },
      { localDate: '2026-09-10', durationMin: 90, ended: true },
      { localDate: '2026-09-22', durationMin: -5, ended: true },
    ], '2026-09-25');
    expect(result.days).toHaveLength(14);
    expect(result.days[0].date).toBe('2026-09-11');
    expect(result.days.at(-1)).toEqual({ date: '2026-09-24', minutes: 30 });
    expect(result.activeDays).toBe(1);
    expect(result.totalMinutes).toBe(30);
    expect(result.todayMinutes).toBe(10);
  });
});
