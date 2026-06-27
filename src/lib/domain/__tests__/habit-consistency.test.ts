import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  buildConsistencyModel,
  buildHabitStrip,
  formatDayLabel,
  frequencyLabel,
  type HabitForModel,
} from '../habit-consistency';

describe('addDaysISO', () => {
  it('steps within a month', () => {
    expect(addDaysISO('2026-02-10', -1)).toBe('2026-02-09');
    expect(addDaysISO('2026-02-10', 3)).toBe('2026-02-13');
  });

  it('crosses month and year boundaries', () => {
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysISO('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysISO('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('handles leap days', () => {
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDaysISO('2024-02-29', 1)).toBe('2024-03-01');
  });
});

describe('formatDayLabel', () => {
  it('zero-pads the day and abbreviates the month', () => {
    expect(formatDayLabel('2026-06-27')).toBe('27 JUN');
    expect(formatDayLabel('2026-01-05')).toBe('05 JAN');
  });
});

describe('frequencyLabel', () => {
  it('labels each frequency kind', () => {
    expect(frequencyLabel({ type: 'daily' })).toBe('DAILY');
    expect(frequencyLabel({ type: 'weekly', days: [5, 1, 3] })).toBe('MON · WED · FRI');
    expect(frequencyLabel({ type: 'x_per_week', count: 3 })).toBe('3× / WK');
  });
});

describe('buildHabitStrip', () => {
  it('returns one oldest→newest cell per day with today last', () => {
    const strip = buildHabitStrip(['2026-02-10'], { type: 'daily' }, '2026-02-10', 3);
    expect(strip.map((c) => c.date)).toEqual(['2026-02-08', '2026-02-09', '2026-02-10']);
    expect(strip.every((c) => c.due)).toBe(true);
    expect(strip.map((c) => c.done)).toEqual([false, false, true]);
  });

  it('marks non-due days for weekly habits', () => {
    // Mondays only. 2026-02-09 is a Monday.
    const strip = buildHabitStrip([], { type: 'weekly', days: [1] }, '2026-02-10', 3);
    const monday = strip.find((c) => c.date === '2026-02-09');
    const tuesday = strip.find((c) => c.date === '2026-02-10');
    expect(monday?.due).toBe(true);
    expect(tuesday?.due).toBe(false);
  });
});

describe('buildConsistencyModel', () => {
  const habits: HabitForModel[] = [
    {
      id: 'a',
      name: 'Water',
      frequency: { type: 'daily' },
      logDates: ['2026-02-10', '2026-02-09', '2026-02-08'],
      currentStreak: 3,
    },
    {
      id: 'b',
      name: 'Read',
      frequency: { type: 'daily' },
      logDates: ['2026-02-10'],
      currentStreak: 1,
    },
  ];

  it('aggregates daily due/done and finds today', () => {
    const m = buildConsistencyModel(habits, '2026-02-10', 3);
    expect(m.days).toHaveLength(3);
    expect(m.dueToday).toBe(2);
    expect(m.doneToday).toBe(2);
    expect(m.days[2].ratio).toBe(1);
    expect(m.days[2].isToday).toBe(true);
    expect(m.days[0]).toMatchObject({ date: '2026-02-08', due: 2, done: 1 });
  });

  it('counts perfect/active days and overall rate', () => {
    const m = buildConsistencyModel(habits, '2026-02-10', 3);
    expect(m.activeDays).toBe(3);
    expect(m.perfectDays).toBe(1); // only 02-10 had both done
    expect(m.overallRate).toBeCloseTo(4 / 6, 5);
  });

  it('reports the single best active streak', () => {
    const m = buildConsistencyModel(habits, '2026-02-10', 3);
    expect(m.best).toEqual({ value: 3, name: 'Water' });
  });

  it('returns nulls/zeros with no habits', () => {
    const m = buildConsistencyModel([], '2026-02-10', 3);
    expect(m.totalHabits).toBe(0);
    expect(m.dueToday).toBe(0);
    expect(m.best).toBeNull();
    expect(m.overallRate).toBe(0);
  });
});
