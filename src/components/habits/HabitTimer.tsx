'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { logHabit } from '@/lib/actions/habits';
import { formatDuration } from '@/lib/utils/duration';

type Persisted = { startedAtMs: number };

const storageKey = (habitId: string) => `habit-timer:${habitId}`;

/**
 * Longest single session a timer habit can log. Matches the focus console's
 * 180-minute ceiling. A timer left running past this is auto-stopped, so a
 * forgotten tab can't log days of "elapsed" time against one habit.
 */
export const MAX_SESSION_SECONDS = 3 * 60 * 60;
const MAX_SESSION_MS = MAX_SESSION_SECONDS * 1000;
const CAP_LABEL = formatDuration(MAX_SESSION_SECONDS);

/** Whole seconds to log for a session started at `startedAtMs` as of `now`:
 *  at least 1, never more than the cap. */
export function sessionSeconds(startedAtMs: number, now: number): number {
  const elapsed = Math.floor((now - startedAtMs) / 1000);
  return Math.min(MAX_SESSION_SECONDS, Math.max(1, elapsed));
}

/** True once a session has run for the full cap and must be auto-stopped. */
export function sessionExpired(startedAtMs: number, now: number): boolean {
  return now - startedAtMs >= MAX_SESSION_MS;
}

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

type Notice = { kind: 'capped' | 'error'; text: string };

export function HabitTimer({ habitId }: { habitId: string }) {
  const [startedAtMs, setStartedAtMs] = React.useState<number | null>(null);
  const [tick, setTick] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  // Guards against a second stop while one is in flight (the tick effect
  // re-evaluates every second) and stops auto-retrying after a failed save.
  const inflight = React.useRef(false);
  const failed = React.useRef(false);

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

  const stop = React.useCallback(async () => {
    if (startedAtMs === null || inflight.current) return;
    inflight.current = true;
    setSubmitting(true);
    setNotice(null);
    const now = Date.now();
    const seconds = sessionSeconds(startedAtMs, now);
    // A capped session is stamped at the moment the cap was hit, so a timer
    // forgotten overnight lands on the day it actually ran, not on today.
    const capped = sessionExpired(startedAtMs, now);
    try {
      await logHabit({
        habit_id: habitId,
        value: seconds,
        ...(capped
          ? {
              note: `auto: stopped at ${CAP_LABEL}`,
              logged_at: new Date(startedAtMs + MAX_SESSION_MS).toISOString(),
            }
          : {}),
      });
      window.localStorage.removeItem(storageKey(habitId));
      setStartedAtMs(null);
      failed.current = false;
      if (capped) setNotice({ kind: 'capped', text: `Auto-stopped at ${CAP_LABEL}` });
    } catch {
      failed.current = true;
      setNotice({ kind: 'error', text: 'Could not save — press stop to retry' });
    } finally {
      inflight.current = false;
      setSubmitting(false);
    }
  }, [habitId, startedAtMs]);

  // Auto-stop once the session reaches the cap. Runs on every tick for a live
  // session and once on mount for a stale one restored from a previous visit.
  // After a failed save it waits for the user to press stop rather than
  // hammering the server once a second.
  React.useEffect(() => {
    if (startedAtMs === null || failed.current) return;
    if (!sessionExpired(startedAtMs, Date.now())) return;
    void stop();
  }, [startedAtMs, tick, stop]);

  const elapsed =
    startedAtMs === null
      ? 0
      : Math.min(MAX_SESSION_SECONDS, Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));

  const start = () => {
    const now = Date.now();
    setNotice(null);
    failed.current = false;
    setStartedAtMs(now);
    window.localStorage.setItem(
      storageKey(habitId),
      JSON.stringify({ startedAtMs: now }),
    );
  };

  const stopManually = () => {
    failed.current = false;
    void stop();
  };

  return (
    <div className="flex flex-col items-end gap-1">
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
            onClick={stopManually}
            disabled={submitting}
            data-testid={`timer-stop-${habitId}`}
          >
            {submitting ? 'Saving…' : 'Stop & log'}
          </Button>
        )}
      </div>
      {notice && (
        <span
          role="status"
          className={`font-mono text-[10px] uppercase tracking-[0.08em] ${
            notice.kind === 'error' ? 'text-destructive' : 'text-text-disabled'
          }`}
        >
          {notice.text}
        </span>
      )}
    </div>
  );
}

function formatHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
