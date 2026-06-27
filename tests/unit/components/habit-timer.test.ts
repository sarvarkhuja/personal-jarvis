import { describe, expect, it } from 'vitest';
import { readPersistedStart } from '@/components/habits/HabitTimer';

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
