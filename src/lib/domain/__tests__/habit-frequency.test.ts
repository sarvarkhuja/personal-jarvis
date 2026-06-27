import { describe, expect, it } from 'vitest';
import { ALL_DAYS, frequencyFromDays } from '../habit-frequency';

describe('frequencyFromDays', () => {
  it('collapses all seven days to daily', () => {
    expect(frequencyFromDays([1, 2, 3, 4, 5, 6, 7])).toEqual({ type: 'daily' });
  });

  it('treats a weekday subset as weekly with sorted days', () => {
    expect(frequencyFromDays([5, 1, 3])).toEqual({
      type: 'weekly',
      days: [1, 3, 5],
    });
  });

  it('dedupes repeated selections', () => {
    expect(frequencyFromDays([2, 2, 2])).toEqual({ type: 'weekly', days: [2] });
  });

  it('exposes Monday-first ISO weekday order', () => {
    expect([...ALL_DAYS]).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
