import { describe, it, expect } from 'vitest';
import {
  TRACKS, DESIGN_ITEM_TEXT, itemHash, itemText, isRevised, currentWeek, paceSummary,
  activityDots, normalizeTopic, suggestTopics, knownTopics, weekTally, overallTally, monthOfWeek,
  type ItemStatus, type Track,
} from '../roadmap';

const st = (week: number, track: Track, status: 'done' | 'skipped' = 'done', updated_at = '2026-10-20T10:00:00Z'): ItemStatus =>
  ({ week, track, status, updated_at, item_hash: itemHash(itemText(week, track)) });

describe('roadmap domain', () => {
  it('current week = first week with an unresolved item; skipped counts as resolved', () => {
    const w1 = TRACKS.map((t) => st(1, t.key, t.key === 'ml' ? 'skipped' : 'done'));
    expect(currentWeek([])).toBe(1);
    expect(currentWeek(w1)).toBe(2);
  });
  it('returns null when all 140 are resolved', () => {
    const all = Array.from({ length: 28 }, (_, i) => TRACKS.map((t) => st(i + 1, t.key))).flat();
    expect(all).toHaveLength(140);
    expect(currentWeek(all)).toBeNull();
    expect(overallTally(all)).toEqual({ done: 140, skipped: 0, total: 140 });
  });
  it('flags revised items when stored hash differs', () => {
    expect(isRevised({ ...st(3, 'go'), item_hash: 'old' })).toBe(true);
    expect(isRevised(st(3, 'go'))).toBe(false);
  });
  it('design item text is identical every week', () => { expect(itemText(7, 'design')).toBe(DESIGN_ITEM_TEXT); });
  it('tallies a week and maps months', () => {
    expect(weekTally([st(2, 'go'), st(2, 'ai', 'skipped')], 2)).toEqual({ done: 1, skipped: 1, open: 3 });
    expect(monthOfWeek(5)).toBe(2);
  });
  it('pace defaults to 5/week with no history and projects finish from today', () => {
    expect(paceSummary([], '2026-10-28', 'Asia/Tashkent')).toEqual({ perWeek: 5, remaining: 140, finishMonth: '2027-05' });
  });
  it('pace uses resolved items in the last 28 local days', () => {
    const s = Array.from({ length: 8 }, (_, i) => st(1 + Math.floor(i / 5), TRACKS[i % 5].key, 'done', '2026-10-15T10:00:00Z'));
    expect(paceSummary(s, '2026-10-28', 'Asia/Tashkent').perWeek).toBe(2);
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
