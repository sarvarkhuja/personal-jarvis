import { describe, expect, it } from 'vitest';
import { formatDuration } from '../duration';

describe('formatDuration', () => {
  it('shows seconds under a minute', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45)).toBe('45s');
  });

  it('shows whole minutes under an hour, dropping seconds', () => {
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(90)).toBe('1m');
    expect(formatDuration(3599)).toBe('59m');
  });

  it('shows hours and minutes, dropping a zero minute', () => {
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(3660)).toBe('1h 1m');
    expect(formatDuration(4800)).toBe('1h 20m'); // 80 min
    expect(formatDuration(7200)).toBe('2h');
  });

  it('floors negatives and non-finite to 0s', () => {
    expect(formatDuration(-10)).toBe('0s');
    expect(formatDuration(NaN)).toBe('0s');
  });
});
