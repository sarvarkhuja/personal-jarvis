import { describe, expect, it } from 'vitest';
import {
  MAX_SESSION_SECONDS,
  readPersistedStart,
  sessionExpired,
  sessionSeconds,
} from '@/components/habits/HabitTimer';

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
  };
}

describe('readPersistedStart', () => {
  it('returns null when nothing is persisted', () => {
    const storage = fakeStorage();
    expect(readPersistedStart(storage, 'h1', Date.now())).toBeNull();
  });

  it('computes whole-second elapsed from persisted start', () => {
    const start = 1_700_000_000_000;
    const storage = fakeStorage({
      'habit-timer:h1': JSON.stringify({ startedAtMs: start }),
    });
    const res = readPersistedStart(storage, 'h1', start + 90_500); // 90.5s later
    expect(res).not.toBeNull();
    expect(res!.elapsedSeconds).toBe(90);
    expect(res!.startedAtMs).toBe(start);
  });

  it('clamps elapsed to non-negative if clock goes backwards', () => {
    const start = 1_700_000_000_000;
    const storage = fakeStorage({
      'habit-timer:h1': JSON.stringify({ startedAtMs: start }),
    });
    const res = readPersistedStart(storage, 'h1', start - 10_000);
    expect(res!.elapsedSeconds).toBe(0);
  });

  it('returns null on malformed persisted state', () => {
    const storage = fakeStorage({ 'habit-timer:h1': 'not-json' });
    expect(readPersistedStart(storage, 'h1', Date.now())).toBeNull();

    const storage2 = fakeStorage({
      'habit-timer:h1': JSON.stringify({ wrong: 'shape' }),
    });
    expect(readPersistedStart(storage2, 'h1', Date.now())).toBeNull();
  });
});

describe('session cap', () => {
  const start = 1_700_000_000_000;

  it('caps a session at three hours', () => {
    expect(MAX_SESSION_SECONDS).toBe(3 * 60 * 60);
  });

  it('logs whole elapsed seconds while under the cap', () => {
    expect(sessionSeconds(start, start + 90_500)).toBe(90);
  });

  it('never logs less than one second', () => {
    expect(sessionSeconds(start, start)).toBe(1);
    expect(sessionSeconds(start, start - 10_000)).toBe(1);
  });

  it('clamps a forgotten session to the cap instead of the real elapsed time', () => {
    const elapsed195h = 195 * 60 * 60 * 1000;
    expect(sessionSeconds(start, start + elapsed195h)).toBe(MAX_SESSION_SECONDS);
  });

  it('reports expiry exactly when the cap is reached, not before', () => {
    const capMs = MAX_SESSION_SECONDS * 1000;
    expect(sessionExpired(start, start + capMs - 1)).toBe(false);
    expect(sessionExpired(start, start + capMs)).toBe(true);
  });
});
