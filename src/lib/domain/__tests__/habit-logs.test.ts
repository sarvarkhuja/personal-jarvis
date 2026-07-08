import { describe, expect, it } from 'vitest';
import { groupLoggedHabitIdsByDate, sumSecondsByHabit } from '../habit-logs';

describe('groupLoggedHabitIdsByDate', () => {
  it('groups habit ids under their log_date', () => {
    const map = groupLoggedHabitIdsByDate([
      { habit_id: 'a', log_date: '2026-06-26' },
      { habit_id: 'b', log_date: '2026-06-26' },
      { habit_id: 'a', log_date: '2026-06-27' },
    ]);
    expect(map.get('2026-06-26')).toEqual(['a', 'b']);
    expect(map.get('2026-06-27')).toEqual(['a']);
  });

  it('collapses duplicate (habit_id, log_date) rows to a single id', () => {
    // Reproduces the duplicate React-key bug: a `check` habit double-tapped,
    // and a `timer` habit with several focus-session logs on the same day.
    const map = groupLoggedHabitIdsByDate([
      { habit_id: 'a5cc5460', log_date: '2026-06-26' },
      { habit_id: 'a5cc5460', log_date: '2026-06-26' },
      { habit_id: 'timer1', log_date: '2026-06-26' },
      { habit_id: 'timer1', log_date: '2026-06-26' },
      { habit_id: 'timer1', log_date: '2026-06-26' },
    ]);
    expect(map.get('2026-06-26')).toEqual(['a5cc5460', 'timer1']);
  });

  it('preserves first-seen order of distinct ids', () => {
    const map = groupLoggedHabitIdsByDate([
      { habit_id: 'c', log_date: '2026-06-26' },
      { habit_id: 'a', log_date: '2026-06-26' },
      { habit_id: 'c', log_date: '2026-06-26' },
      { habit_id: 'b', log_date: '2026-06-26' },
    ]);
    expect(map.get('2026-06-26')).toEqual(['c', 'a', 'b']);
  });

  it('returns an empty map for no logs', () => {
    expect(groupLoggedHabitIdsByDate([]).size).toBe(0);
  });
});

describe('sumSecondsByHabit', () => {
  it('adds all of a habit\'s logs on the given day', () => {
    const map = sumSecondsByHabit(
      [
        { habit_id: 'timer1', log_date: '2026-07-09', value: 1500 },
        { habit_id: 'timer1', log_date: '2026-07-09', value: 900 },
        { habit_id: 'timer2', log_date: '2026-07-09', value: 600 },
      ],
      '2026-07-09',
    );
    expect(map.get('timer1')).toBe(2400);
    expect(map.get('timer2')).toBe(600);
  });

  it('ignores rows on other dates', () => {
    const map = sumSecondsByHabit(
      [
        { habit_id: 'timer1', log_date: '2026-07-08', value: 1000 },
        { habit_id: 'timer1', log_date: '2026-07-09', value: 500 },
      ],
      '2026-07-09',
    );
    expect(map.get('timer1')).toBe(500);
  });

  it('coalesces null value to 0', () => {
    const map = sumSecondsByHabit(
      [
        { habit_id: 'timer1', log_date: '2026-07-09', value: null },
        { habit_id: 'timer1', log_date: '2026-07-09', value: 300 },
      ],
      '2026-07-09',
    );
    expect(map.get('timer1')).toBe(300);
  });

  it('returns an empty map for no logs', () => {
    expect(sumSecondsByHabit([], '2026-07-09').size).toBe(0);
  });
});
