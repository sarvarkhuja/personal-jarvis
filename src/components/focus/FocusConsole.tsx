'use client';

import * as React from 'react';
import { startFocusSession, endFocusSession } from '@/lib/actions/focus';
import { focusTickCount } from '@/lib/utils/focus-metrics';

function testOverrideSeconds(): number | null {
  // Tests inject window.__TEST_FOCUS_SECONDS via Playwright's addInitScript so
  // the production timer logic can run in a few seconds.
  if (typeof window === 'undefined') return null;
  const v = (window as unknown as { __TEST_FOCUS_SECONDS?: unknown })
    .__TEST_FOCUS_SECONDS;
  return typeof v === 'number' && v > 0 ? v : null;
}

type RunningSession = {
  id: string;
  startedAtMs: number;
  durationSeconds: number;
  intent: string;
  plannedMinutes: number;
};

const KEY = 'focus-session:active';
const PRESETS = [15, 25, 45, 60, 90] as const;
const BLINK = 'motion-safe:[animation:blink_1s_step-end_infinite]';
// One shared size for the idle SET number and the running countdown so arming
// the session transforms the hero in place — no reflow, no layout jump.
const HERO_NUM = 'clamp(64px, 12vw, 132px)';

export function FocusConsole({
  goalOptions,
  habitOptions,
}: {
  goalOptions: { id: string; label: string }[];
  habitOptions: { id: string; label: string; kind: string; goalId: string }[];
}) {
  const [plannedMinutes, setPlannedMinutes] = React.useState(25);
  const [intent, setIntent] = React.useState('');
  const [goalId, setGoalId] = React.useState<string>('');
  const [habitId, setHabitId] = React.useState<string>('');
  const [running, setRunning] = React.useState<RunningSession | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState(false);
  const [, forceTick] = React.useState(0);

  // A linked timer habit always belongs to a goal. Scope the options to the
  // chosen goal so the dropdown only offers habits that match it; with no goal
  // picked yet, offer every timer habit.
  const timerHabits = React.useMemo(
    () =>
      habitOptions.filter(
        (h) => h.kind === 'timer' && (goalId === '' || h.goalId === goalId),
      ),
    [habitOptions, goalId],
  );

  // If the goal changes such that the linked habit no longer belongs to it,
  // drop the stale selection so we never arm a session with a mismatched habit.
  React.useEffect(() => {
    if (habitId !== '' && !timerHabits.some((h) => h.id === habitId)) {
      setHabitId('');
    }
  }, [habitId, timerHabits]);

  // Restore an in-progress session after a reload.
  React.useEffect(() => {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<RunningSession>;
      if (
        typeof parsed.id === 'string' &&
        typeof parsed.startedAtMs === 'number' &&
        typeof parsed.durationSeconds === 'number'
      ) {
        setRunning({
          id: parsed.id,
          startedAtMs: parsed.startedAtMs,
          durationSeconds: parsed.durationSeconds,
          intent: parsed.intent ?? '',
          plannedMinutes:
            parsed.plannedMinutes ?? Math.round(parsed.durationSeconds / 60),
        });
      }
    } catch {
      window.localStorage.removeItem(KEY);
    }
  }, []);

  // Tick while running so the countdown + playhead advance.
  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => forceTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const remaining = running
    ? Math.max(0, running.startedAtMs + running.durationSeconds * 1000 - Date.now())
    : 0;

  // Auto-complete when the timer hits zero.
  React.useEffect(() => {
    if (!running) return;
    if (remaining > 0) return;
    finalize(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, remaining]);

  function persist(s: RunningSession | null) {
    if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
    else window.localStorage.removeItem(KEY);
  }

  async function start() {
    setError(null);
    setFlash(false);
    setPending(true);
    try {
      const created = await startFocusSession({
        planned_minutes: plannedMinutes,
        intent: intent || undefined,
        linked_goal_id: goalId || null,
        linked_habit_id: habitId || null,
      });
      const durationSeconds = testOverrideSeconds() ?? plannedMinutes * 60;
      const session: RunningSession = {
        id: (created as { id: string }).id,
        startedAtMs: Date.now(),
        durationSeconds,
        intent,
        plannedMinutes,
      };
      setRunning(session);
      persist(session);
      requestNotificationPermission();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setPending(false);
    }
  }

  async function finalize(completed: boolean) {
    if (!running) return;
    setError(null);
    setPending(true);
    const id = running.id;
    setRunning(null);
    persist(null);
    if (completed) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 2200);
    }
    try {
      await endFocusSession({ id, completed });
      if (completed) ringBell();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end');
    } finally {
      setPending(false);
    }
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const tickCount = focusTickCount(plannedMinutes);
  const durationMs = running ? running.durationSeconds * 1000 : 0;
  const fraction = durationMs > 0 ? Math.min(1, Math.max(0, (durationMs - remaining) / durationMs)) : 0;
  const liveIndex = running ? Math.min(tickCount - 1, Math.floor(fraction * tickCount)) : -1;
  const endsLabel = running
    ? new Date(running.startedAtMs + running.durationSeconds * 1000).toLocaleTimeString(
      'en-GB',
      { hour: '2-digit', minute: '2-digit' },
    )
    : '';
  const [mm, ss] = formatMMSS(remaining / 1000).split(':');

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.85fr)]">
      {/* ── LEFT CONSOLE ────────────────────────────────────────────────────── */}
      <aside className="rounded-lg border border-border bg-surface p-6">
        {running ? (
          <div className="flex h-full flex-col">
            <div className="mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
              <span className={`text-accent ${BLINK}`}>●</span> SESSION LIVE
            </div>
            <ConsoleReadout label="Intent" value={running.intent || '— UNTITLED —'} />
            <ConsoleReadout
              label="Started"
              value={new Date(running.startedAtMs).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
            <ConsoleReadout label="Planned" value={`${running.plannedMinutes} MIN`} />
            <p className="mt-auto pt-6 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-text-secondary">
              The console is locked while a session runs. Abort from the timer.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
              [ ARM SESSION ]
            </div>

            <Field label="Intent" htmlFor="focus-intent">
              <input
                id="focus-intent"
                data-testid="focus-intent"
                placeholder="What you're focusing on"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full border-b border-border-visible bg-transparent py-2 font-mono text-[13px] text-text-primary transition-colors placeholder:text-text-secondary/60 focus:border-text-primary focus:outline-none"
              />
            </Field>

            <Field label="Linked goal" htmlFor="focus-goal">
              <select
                id="focus-goal"
                data-testid="focus-goal"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full appearance-none border-b border-border-visible bg-transparent py-2 font-mono text-[13px] text-text-primary transition-colors focus:border-text-primary focus:outline-none"
              >
                <option value="">— none —</option>
                {goalOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Linked timer habit" htmlFor="focus-habit">
              <select
                id="focus-habit"
                data-testid="focus-habit"
                value={habitId}
                onChange={(e) => setHabitId(e.target.value)}
                className="w-full appearance-none border-b border-border-visible bg-transparent py-2 font-mono text-[13px] text-text-primary transition-colors focus:border-text-primary focus:outline-none disabled:opacity-40"
                disabled={timerHabits.length === 0}
              >
                <option value="">— none —</option>
                {timerHabits.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <button
              type="button"
              data-testid="focus-start"
              disabled={pending || plannedMinutes <= 0}
              onClick={start}
              className="h-12 w-full rounded-full bg-text-display font-mono text-[13px] uppercase tracking-[0.06em] text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? '[ ARMING ]' : 'Arm session'}
            </button>

            {error && (
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                [ERROR: {error}]
              </p>
            )}
          </div>
        )}
      </aside>

      {/* ── SIGNATURE HERO ──────────────────────────────────────────────────── */}
      {/* Constant skeleton: header · number · tick-track · sub-line · action row.
          Idle and running share the number size, a fixed sub-line height, and a
          bottom-pinned action row, so arming transforms the card in place. */}
      <section className="dot-grid-subtle relative flex min-h-[24rem] flex-col overflow-hidden rounded-lg border border-border bg-surface p-6 md:p-8">
        {/* header rail */}
        <div className="mb-8 flex items-baseline justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.08em]">
          <span className="text-text-secondary">
            [ FOCUS CONSOLE · {running ? 'LIVE' : flash ? 'DONE' : 'IDLE'} ]
          </span>
          {running ? (
            <span className="text-accent">
              <span className={`mr-1 ${BLINK}`}>●</span>RUNNING
            </span>
          ) : flash ? (
            <span className="text-success">[ COMPLETE ]</span>
          ) : (
            <span className="text-text-secondary">[ READY ]</span>
          )}
        </div>

        {flash ? (
          <div className="flex flex-1 flex-col justify-center">
            <div className="font-doto text-5xl font-bold leading-none text-success md:text-6xl">
              SESSION
            </div>
            <div className="mt-2 font-doto text-5xl font-bold leading-none text-success md:text-6xl">
              COMPLETE
            </div>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
              Logged. Take a break.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* giant number — shared size keeps the card height stable when arming */}
            <div className="flex items-baseline">
              {running ? (
                <span
                  data-testid="focus-elapsed"
                  className="font-bold leading-none tabular-nums text-text-display"
                  style={{ fontSize: HERO_NUM }}
                >
                  {mm}
                  <span className={BLINK}>:</span>
                  {ss}
                </span>
              ) : (
                <>
                  <span
                    className="font-doto font-bold leading-none tabular-nums tracking-tight text-text-display"
                    style={{ fontSize: HERO_NUM }}
                  >
                    {plannedMinutes || 0}
                  </span>
                  <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                    min
                  </span>
                </>
              )}
            </div>

            <div className="mt-6">
              <TickTrack count={tickCount} liveIndex={running ? liveIndex : -1} />
            </div>

            {/* sub-line — reserved height so 1 vs 2 lines never shifts the layout */}
            <div className="mt-4 flex min-h-[2.75rem] items-start">
              {running ? (
                <div className="flex w-full items-baseline justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                  <span className="min-w-0 flex-1 truncate">
                    INTENT · {running.intent || '— UNTITLED —'}
                  </span>
                  <span className="shrink-0">ENDS {endsLabel}</span>
                </div>
              ) : (
                <p className="font-sans text-[15px] leading-snug text-text-secondary">
                  Set a length, name the intent, arm the session.
                </p>
              )}
            </div>

            {/* action row — bottom-pinned so it lands in the same spot in both states */}
            <div className="mt-auto pt-8">
              {running ? (
                <button
                  type="button"
                  data-testid="focus-abort"
                  disabled={pending}
                  onClick={() => finalize(false)}
                  className="rounded-full border border-border-visible px-5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  Abort
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {PRESETS.map((p) => {
                    const active = plannedMinutes === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlannedMinutes(p)}
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${active
                            ? 'border-text-primary text-text-primary'
                            : 'border-border-visible text-text-secondary hover:border-text-primary hover:text-text-primary'
                          }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <label htmlFor="focus-minutes" className="ml-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                      or
                    </span>
                    <input
                      id="focus-minutes"
                      data-testid="focus-minutes"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={180}
                      value={plannedMinutes}
                      onChange={(e) =>
                        setPlannedMinutes(Math.min(180, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="w-16 border-b border-border-visible bg-transparent py-1 font-mono text-[13px] tabular-nums text-text-primary transition-colors focus:border-text-primary focus:outline-none"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                      min
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** The ruler of minute-ticks. Idle (liveIndex < 0): every tick is an un-armed
 *  hairline. Running: ticks left of the playhead are spent, the playhead is the
 *  single red tick, ticks to its right are the minutes still to come. */
function TickTrack({ count, liveIndex }: { count: number; liveIndex: number }) {
  return (
    <div className="flex h-6 w-full items-stretch gap-[2px]" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        let cls = 'bg-border-visible';
        if (liveIndex >= 0) {
          if (i < liveIndex) cls = 'bg-text-disabled';
          else if (i === liveIndex) cls = 'bg-accent';
          else cls = 'bg-text-primary';
        }
        return <div key={i} className={`flex-1 ${cls}`} />;
      })}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ConsoleReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-3">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
        {label}
      </div>
      <div className="truncate font-mono text-[13px] tracking-[0.04em] text-text-primary">
        {value}
      </div>
    </div>
  );
}

function formatMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function requestNotificationPermission() {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

function ringBell() {
  if (typeof window === 'undefined') return;
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus session complete', {
        body: 'Time to take a break.',
      });
    }
  } catch {
    /* noop */
  }
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.type = 'sine';
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {
    /* noop */
  }
}
