import { describe, it, expect } from 'vitest';
import {
  addDays,
  focusTickCount,
  buildFocusMetrics,
  type FocusSessionLite,
} from '../focus-metrics';

const TODAY = '2026-06-26';

type Override = Partial<FocusSessionLite> & { id: string };
function s(p: Override): FocusSessionLite {
  return {
    localDate: TODAY,
    startedAtMs: 0,
    durationMin: 0,
    plannedMinutes: 0,
    completed: false,
    ended: true,
    intent: null,
    goalLabel: null,
    ...p,
  };
}

describe('focusTickCount', () => {
  it('is one tick per minute up to 90', () => {
    expect(focusTickCount(1)).toBe(1);
    expect(focusTickCount(25)).toBe(25);
    expect(focusTickCount(90)).toBe(90);
  });
  it('collapses to one tick per 2 minutes past 90', () => {
    expect(focusTickCount(91)).toBe(46);
    expect(focusTickCount(120)).toBe(60);
  });
  it('clamps out-of-range input', () => {
    expect(focusTickCount(0)).toBe(1);
    expect(focusTickCount(200)).toBe(90);
  });
});

describe('addDays', () => {
  it('shifts a YYYY-MM-DD across month boundaries', () => {
    expect(addDays('2026-06-26', 1)).toBe('2026-06-27');
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('buildFocusMetrics', () => {
  const sessions = [
    s({ id: 'A', localDate: TODAY, durationMin: 25, plannedMinutes: 25, completed: true, goalLabel: 'Ship app', startedAtMs: 600 }),
    s({ id: 'B', localDate: TODAY, durationMin: 50, plannedMinutes: 50, completed: true, intent: 'Write', startedAtMs: 500 }),
    s({ id: 'C', localDate: TODAY, durationMin: 12, plannedMinutes: 30, completed: false, intent: 'Email', startedAtMs: 400 }),
    s({ id: 'D', localDate: addDays(TODAY, -1), durationMin: 60, plannedMinutes: 60, completed: true, goalLabel: 'Ship app', startedAtMs: 300 }),
    s({ id: 'E', localDate: addDays(TODAY, -2), durationMin: 15, plannedMinutes: 15, completed: true, goalLabel: 'Ship app', startedAtMs: 200 }),
    s({ id: 'F', localDate: TODAY, durationMin: 0, plannedMinutes: 45, completed: false, ended: false, intent: 'Deep', startedAtMs: 550 }),
  ];
  const m = buildFocusMetrics(sessions, TODAY);

  it('counts only completed minutes for TODAY', () => {
    expect(m.today.focusedMin).toBe(75); // A25 + B50; aborted C and live F excluded
    expect(m.today.sessions).toBe(4); // A B C F
    expect(m.today.kept).toBe(2);
    expect(m.today.endedCount).toBe(3); // A B C (F not ended)
    expect(m.today.longestMin).toBe(50);
  });

  it('builds a 7-day week with today carrying its completed minutes', () => {
    expect(m.week.bars).toHaveLength(7);
    expect(m.week.bars.find((b) => b.isToday)?.min).toBe(75);
  });

  it('counts the streak back from today', () => {
    expect(m.streak.count).toBe(3); // today, -1, -2 all have completed sessions
    expect(m.streak.last14).toHaveLength(14);
    expect(m.streak.last14[13]).toEqual({ date: TODAY, active: true });
  });

  it('renders a 35-cell rhythm grid', () => {
    expect(m.rhythm.cells).toHaveLength(35);
  });

  it('computes completion rate over ended sessions only', () => {
    expect(m.completion.kept).toBe(4); // A B D E
    expect(m.completion.aborted).toBe(1); // C
    expect(m.completion.rate).toBeCloseTo(0.8);
  });

  it('groups WHERE IT GOES by goal then intent, sorted desc', () => {
    expect(m.where.totalMin).toBe(150);
    expect(m.where.rows[0]).toMatchObject({ label: 'Ship app', min: 100 });
    expect(m.where.rows[1]).toMatchObject({ label: 'Write', min: 50 });
  });

  it('orders the log newest-first and tags each state', () => {
    expect(m.log.map((r) => r.id)).toEqual(['A', 'F', 'B', 'C', 'D', 'E']);
    expect(m.log.find((r) => r.id === 'C')?.state).toBe('ABORT');
    expect(m.log.find((r) => r.id === 'F')?.state).toBe('LIVE');
    expect(m.log.find((r) => r.id === 'A')?.state).toBe('COMPLETE');
  });

  it('falls back to UNTITLED when no goal or intent', () => {
    const only = buildFocusMetrics(
      [s({ id: 'X', durationMin: 10, plannedMinutes: 10, completed: true, startedAtMs: 1 })],
      TODAY,
    );
    expect(only.where.rows[0].label).toBe('— UNTITLED —');
    expect(only.log[0].label).toBe('— UNTITLED —');
  });

  it('keeps a streak alive when today has no session yet but yesterday does', () => {
    const y = buildFocusMetrics(
      [
        s({ id: 'Y1', localDate: addDays(TODAY, -1), durationMin: 30, completed: true, startedAtMs: 2 }),
        s({ id: 'Y2', localDate: addDays(TODAY, -2), durationMin: 30, completed: true, startedAtMs: 1 }),
      ],
      TODAY,
    );
    expect(y.streak.count).toBe(2);
  });
});
