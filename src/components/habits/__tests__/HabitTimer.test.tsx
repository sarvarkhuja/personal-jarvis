import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logHabit } from '@/lib/actions/habits';
import { HabitTimer, MAX_SESSION_SECONDS } from '../HabitTimer';

vi.mock('@/lib/actions/habits', () => ({ logHabit: vi.fn() }));

const KEY = 'habit-timer:h1';
const HOUR = 60 * 60 * 1000;
const CAP_MS = MAX_SESSION_SECONDS * 1000;

/** The payload a capped session must produce: clamped value, audit note, and
 *  a logged_at at the moment the cap was hit so it lands on the right day. */
function cappedLog(startedAtMs: number) {
  return {
    habit_id: 'h1',
    value: MAX_SESSION_SECONDS,
    note: 'auto: stopped at 3h',
    logged_at: new Date(startedAtMs + CAP_MS).toISOString(),
  };
}

describe('HabitTimer auto-stop', () => {
  beforeEach(() => {
    vi.mocked(logHabit).mockReset();
    vi.mocked(logHabit).mockResolvedValue({} as never);
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('auto-stops a session left running from a previous visit and logs it on the day it ran', async () => {
    const start = Date.now() - 195 * HOUR;
    window.localStorage.setItem(KEY, JSON.stringify({ startedAtMs: start }));

    render(<HabitTimer habitId="h1" />);

    await waitFor(() => expect(logHabit).toHaveBeenCalledTimes(1));
    expect(logHabit).toHaveBeenCalledWith(cappedLog(start));
    await waitFor(() => expect(window.localStorage.getItem(KEY)).toBeNull());
    expect(screen.getByTestId('timer-start-h1')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/auto-stopped at 3h/i);
  });

  it('keeps a recent session running on mount', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ startedAtMs: Date.now() - 60_000 }));

    render(<HabitTimer habitId="h1" />);

    await screen.findByTestId('timer-stop-h1');
    expect(logHabit).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(KEY)).not.toBeNull();
  });

  it('auto-stops a live session the moment it reaches the cap', async () => {
    vi.useFakeTimers();
    const base = new Date('2026-11-04T09:00:00.000Z').getTime();
    vi.setSystemTime(base);
    render(<HabitTimer habitId="h1" />);
    fireEvent.click(screen.getByTestId('timer-start-h1'));

    // One second short of the cap: still running, nothing logged.
    vi.setSystemTime(base + CAP_MS - 2000);
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(logHabit).not.toHaveBeenCalled();
    expect(screen.getByTestId('timer-stop-h1')).toBeInTheDocument();

    // The tick that reaches the cap stops and logs.
    await act(async () => { vi.advanceTimersByTime(1000); });
    await act(async () => {});
    expect(logHabit).toHaveBeenCalledTimes(1);
    expect(logHabit).toHaveBeenCalledWith(cappedLog(base));
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(screen.getByTestId('timer-start-h1')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/auto-stopped at 3h/i);
  });

  it('manual stop under the cap logs the real elapsed seconds with no note', async () => {
    vi.useFakeTimers();
    const base = new Date('2026-11-04T09:00:00.000Z').getTime();
    vi.setSystemTime(base);
    render(<HabitTimer habitId="h1" />);
    fireEvent.click(screen.getByTestId('timer-start-h1'));

    await act(async () => { vi.advanceTimersByTime(90_000); });
    fireEvent.click(screen.getByTestId('timer-stop-h1'));
    await act(async () => {});

    expect(logHabit).toHaveBeenCalledWith({ habit_id: 'h1', value: 90 });
    expect(screen.getByTestId('timer-start-h1')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows an error when the auto-stop cannot be saved, keeps the session, and does not retry every tick', async () => {
    vi.useFakeTimers();
    vi.mocked(logHabit).mockRejectedValue(new Error('offline'));
    const base = new Date('2026-11-04T09:00:00.000Z').getTime();
    vi.setSystemTime(base);
    const start = base - 4 * HOUR;
    window.localStorage.setItem(KEY, JSON.stringify({ startedAtMs: start }));

    render(<HabitTimer habitId="h1" />);
    await act(async () => {});

    expect(logHabit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/could not save/i);
    expect(window.localStorage.getItem(KEY)).not.toBeNull();

    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(logHabit).toHaveBeenCalledTimes(1);

    // Pressing stop retries, still clamped to the cap.
    vi.mocked(logHabit).mockResolvedValue({} as never);
    fireEvent.click(screen.getByTestId('timer-stop-h1'));
    await act(async () => {});
    expect(logHabit).toHaveBeenCalledTimes(2);
    expect(logHabit).toHaveBeenLastCalledWith(cappedLog(start));
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(screen.getByTestId('timer-start-h1')).toBeInTheDocument();
  });
});
