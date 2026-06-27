'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { logHabit } from '@/lib/actions/habits';

type Persisted = { startedAtMs: number };

const storageKey = (habitId: string) => `habit-timer:${habitId}`;

export function readPersistedStart(
  storage: Pick<Storage, 'getItem'>,
  habitId: string,
  now: number,
): { elapsedSeconds: number; startedAtMs: number } | null {
  const raw = storage.getItem(storageKey(habitId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Persisted;
    if (typeof parsed.startedAtMs !== 'number') return null;
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now - parsed.startedAtMs) / 1000),
    );
    return { elapsedSeconds, startedAtMs: parsed.startedAtMs };
  } catch {
    return null;
  }
}

export function HabitTimer({ habitId }: { habitId: string }) {
  const [startedAtMs, setStartedAtMs] = React.useState<number | null>(null);
  const [tick, setTick] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  // Restore state on mount.
  React.useEffect(() => {
    const restored = readPersistedStart(window.localStorage, habitId, Date.now());
    if (restored) setStartedAtMs(restored.startedAtMs);
  }, [habitId]);

  // 1Hz tick while running.
  React.useEffect(() => {
    if (startedAtMs === null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [startedAtMs]);

  const elapsed =
    startedAtMs === null
      ? 0
      : Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));

  const start = () => {
    const now = Date.now();
    setStartedAtMs(now);
    window.localStorage.setItem(
      storageKey(habitId),
      JSON.stringify({ startedAtMs: now }),
    );
  };

  const stop = async () => {
    if (startedAtMs === null) return;
    const seconds = Math.max(1, Math.floor((Date.now() - startedAtMs) / 1000));
    setSubmitting(true);
    try {
      await logHabit({ habit_id: habitId, value: seconds });
      window.localStorage.removeItem(storageKey(habitId));
      setStartedAtMs(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid={`timer-${habitId}`}>
      <span className="font-mono text-sm tabular-nums" data-testid={`timer-elapsed-${habitId}`}>
        {formatHMS(elapsed)}
      </span>
      {startedAtMs === null ? (
        <Button size="sm" onClick={start} data-testid={`timer-start-${habitId}`}>
          Start
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={stop}
          disabled={submitting}
          data-testid={`timer-stop-${habitId}`}
        >
          {submitting ? 'Saving…' : 'Stop & log'}
        </Button>
      )}
      {/* tick is read to keep the dependency, even though render uses Date.now() */}
      <span className="hidden">{tick}</span>
    </div>
  );
}

function formatHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
