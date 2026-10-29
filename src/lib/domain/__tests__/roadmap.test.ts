import { describe, it, expect } from 'vitest';
import {
  currentWeek, paceSummary, countDone, activityDots, normalizeTopic, suggestTopics, knownTopics, monthOfWeek,
  type ProgressRow,
} from '../roadmap';

const row = (key: string, done_at = '2026-10-20T10:00:00Z'): ProgressRow => ({ key, done_at });
const weeks = [['a1', 'a2'], ['b1', 'b2']];

describe('roadmap domain', () => {
  it('current week is the first week with an unfinished checkpoint', () => {
    expect(currentWeek(weeks, new Set())).toBe(1);
    expect(currentWeek(weeks, new Set(['a1', 'a2', 'b1']))).toBe(2);
    expect(currentWeek(weeks, new Set(['a1']))).toBe(1);
  });
  it('returns null when everything is done', () => {
    expect(currentWeek(weeks, new Set(['a1', 'a2', 'b1', 'b2']))).toBeNull();
  });
  it('counts done keys and maps months', () => {
    expect(countDone(['a1', 'a2', 'x'], new Set(['a1', 'x']))).toBe(2);
    expect(monthOfWeek(5)).toBe(2);
  });
  it('pace defaults to the planned load with no history and projects finish from today', () => {
    expect(paceSummary([], 672, '2026-10-28', 'Asia/Tashkent')).toEqual({ perWeek: 24, remaining: 672, finishMonth: '2027-05' });
  });
  it('pace uses checkpoints done in the last 28 local days', () => {
    const rows = Array.from({ length: 8 }, (_, i) => row(`k${i}`, '2026-10-15T10:00:00Z'));
    expect(paceSummary(rows, 672, '2026-10-28', 'Asia/Tashkent').perWeek).toBe(2);
  });
  it('activity dots mark local days with any timestamp, oldest first', () => {
    const dots = activityDots(['2026-10-27T20:30:00Z'], '2026-10-28', 'Asia/Tashkent');
    expect(dots).toHaveLength(14); expect(dots[13]).toBe(true); expect(dots[12]).toBe(false);
  });
  it('normalizes topics to lower-kebab ≤40 chars', () => {
    expect(normalizeTopic('  Go Concurrency ')).toBe('go-concurrency');
    expect(normalizeTopic('K8s/Operators!!')).toBe('k8s-operators');
    expect(normalizeTopic('x'.repeat(60))).toHaveLength(40);
  });
  it('suggests vocabulary topics for a week and counts known topics', () => {
    expect(suggestTopics(6)).toContain('kafka-redpanda');
    expect(knownTopics([{ topics: ['kafka-redpanda', 'my-own'] }])[0]).toEqual({ slug: 'kafka-redpanda', count: 1 });
  });
  it('every week has at least one vocabulary topic', () => {
    for (let w = 1; w <= 28; w++) expect(suggestTopics(w).length).toBeGreaterThan(0);
  });
});
