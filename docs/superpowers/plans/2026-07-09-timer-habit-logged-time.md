# Timer Habit Logged-Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a timer habit's total logged time for the day (summed across all focus-session and manual logs) with a DONE ✓ marker, on both the Habits card and the Today widget.

**Architecture:** The logging already happens (`endFocusSession` inserts a `habit_log` with `value` in seconds). This work is display-only: two pure helpers (`formatDuration`, `sumSecondsByHabit`), plus wiring `value` through the two server pages into their components.

**Tech Stack:** Next.js (App Router, RSC server components), TypeScript, Tailwind, Vitest.

## Global Constraints

- **Read the local Next.js docs before novel App Router work** — `node_modules/next/dist/docs/` (per `AGENTS.md`). These changes only extend existing server-component data-fetch + prop-passing already present in the touched files; do not introduce new Next.js APIs.
- **`habit_log.value` is seconds for timer habits.** Focus logs: `planned_minutes × 60`; manual `HabitTimer`: elapsed seconds. Only timer-kind habits get a duration display — counter/check `value` is a count.
- **Multiple rows per habit per day are legitimate** for timer habits (see `groupLoggedHabitIdsByDate` doc comment in `src/lib/domain/habit-logs.ts`). Summing must handle N rows.
- **Tests:** Vitest, colocated in `__tests__/`. Run one file with `npx vitest run <path>`.
- **Value can be null in DB** — coalesce to 0 when summing.

---

### Task 1: `formatDuration` helper

**Files:**
- Create: `src/lib/utils/duration.ts`
- Test: `src/lib/utils/__tests__/duration.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatDuration(seconds: number): string` — `"1h 20m"` when ≥ 3600 (drops ` 0m`), `"20m"` when ≥ 60, `"45s"` otherwise. Negative/NaN floored to `"0s"`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/utils/__tests__/duration.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/utils/__tests__/duration.test.ts`
Expected: FAIL — cannot resolve `../duration` / `formatDuration is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/utils/duration.ts
/** Format a duration in seconds as a compact human label: "1h 20m", "20m", "45s". */
export function formatDuration(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (s >= 60) return `${Math.floor(s / 60)}m`;
  return `${s}s`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/utils/__tests__/duration.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/duration.ts src/lib/utils/__tests__/duration.test.ts
git commit -m "feat(habits): add formatDuration helper for logged-time labels"
```

---

### Task 2: `sumSecondsByHabit` helper

**Files:**
- Modify: `src/lib/domain/habit-logs.ts` (append a new export)
- Test: `src/lib/domain/__tests__/habit-logs.test.ts` (append a new `describe`)

**Interfaces:**
- Consumes: nothing.
- Produces: `sumSecondsByHabit(logs: ReadonlyArray<{ habit_id: string; log_date: string; value: number | null }>, today: string): Map<string, number>` — per-habit sum of `value` over rows where `log_date === today`, null coalesced to 0.

- [ ] **Step 1: Write the failing test** (append to the existing test file)

```ts
// append to src/lib/domain/__tests__/habit-logs.test.ts
import { groupLoggedHabitIdsByDate, sumSecondsByHabit } from '../habit-logs';

describe('sumSecondsByHabit', () => {
  it('adds all of a habit\'s logs on the given day', () => {
    const map = sumSecondsByHabit(
      [
        { habit_id: 'timer1', log_date: '2026-07-09', value: 1500 },
        { habit_id: 'timer1', log_date: '2026-07-09', value: 900 },
        { habit_id: 'timer2', log_date: '2026-07-09', value: 600 },
      ],
      '2026-07-09',
    );
    expect(map.get('timer1')).toBe(2400);
    expect(map.get('timer2')).toBe(600);
  });

  it('ignores rows on other dates', () => {
    const map = sumSecondsByHabit(
      [
        { habit_id: 'timer1', log_date: '2026-07-08', value: 1000 },
        { habit_id: 'timer1', log_date: '2026-07-09', value: 500 },
      ],
      '2026-07-09',
    );
    expect(map.get('timer1')).toBe(500);
  });

  it('coalesces null value to 0', () => {
    const map = sumSecondsByHabit(
      [
        { habit_id: 'timer1', log_date: '2026-07-09', value: null },
        { habit_id: 'timer1', log_date: '2026-07-09', value: 300 },
      ],
      '2026-07-09',
    );
    expect(map.get('timer1')).toBe(300);
  });

  it('returns an empty map for no logs', () => {
    expect(sumSecondsByHabit([], '2026-07-09').size).toBe(0);
  });
});
```

Note: the existing file already imports `groupLoggedHabitIdsByDate` on line 2 — replace that import line with the combined import above (do not add a duplicate import).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain/__tests__/habit-logs.test.ts`
Expected: FAIL — `sumSecondsByHabit is not a function`.

- [ ] **Step 3: Write minimal implementation** (append to `src/lib/domain/habit-logs.ts`)

```ts
/**
 * Sum `habit_log.value` per habit for a single day. For timer habits `value` is
 * seconds, and a day legitimately holds several rows (focus-session auto-logs +
 * manual timer logs), so callers get the accumulated total. Null values count 0.
 */
export function sumSecondsByHabit(
  logs: ReadonlyArray<{ habit_id: string; log_date: string; value: number | null }>,
  today: string,
): Map<string, number> {
  const byHabit = new Map<string, number>();
  for (const { habit_id, log_date, value } of logs) {
    if (log_date !== today) continue;
    byHabit.set(habit_id, (byHabit.get(habit_id) ?? 0) + (value ?? 0));
  }
  return byHabit;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/domain/__tests__/habit-logs.test.ts`
Expected: PASS (all existing `groupLoggedHabitIdsByDate` tests + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/habit-logs.ts src/lib/domain/__tests__/habit-logs.test.ts
git commit -m "feat(habits): add sumSecondsByHabit for per-day logged-time totals"
```

---

### Task 3: Habits page — fetch, sum, and render logged time on the timer card

**Files:**
- Modify: `src/app/(app)/habits/page.tsx`
- Modify: `src/components/habits/HabitCard.tsx`

**Interfaces:**
- Consumes: `sumSecondsByHabit` (Task 2), `formatDuration` (Task 1).
- Produces: `HabitCard` gains a required prop `todaySeconds: number`.

- [ ] **Step 1: Add `value` to the habit_logs query and type** (`page.tsx`)

Change the `HabitLogRecord` type (currently lines ~32-35):

```ts
type HabitLogRecord = {
  habit_id: string;
  log_date: string;
  value: number | null;
};
```

Change the logs query select (currently `.select('habit_id, log_date')`, ~line 63):

```ts
    supabase
      .from('habit_logs')
      .select('habit_id, log_date, value')
      .eq('user_id', userId)
      .gte('log_date', sinceISO),
```

- [ ] **Step 2: Build the per-habit seconds map** (`page.tsx`)

Add the import near the other domain imports at the top:

```ts
import { sumSecondsByHabit } from '@/lib/domain/habit-logs';
```

After `const logs = (logsResult.data ?? []) as HabitLogRecord[];` (and the existing `logsByHabit` block), add:

```ts
  const todaySecondsByHabit = sumSecondsByHabit(logs, today);
```

- [ ] **Step 3: Pass `todaySeconds` into each card** (`page.tsx`)

In the `<HabitCard ... />` JSX, add the prop alongside `doneToday`:

```tsx
                      doneToday={c.doneToday}
                      todaySeconds={todaySecondsByHabit.get(c.habit.id) ?? 0}
```

- [ ] **Step 4: Render the total + DONE on the timer card** (`HabitCard.tsx`)

Add the import at the top:

```ts
import { formatDuration } from '@/lib/utils/duration';
```

Add `todaySeconds` to the `Props` type and the destructure:

```ts
  doneToday: boolean;
  scheduledTime: string | null;
  todaySeconds: number;
```

```ts
  doneToday,
  scheduledTime,
  todaySeconds,
}: Props) {
```

Replace the timer branch in the primary row (currently `<HabitTimer habitId={id} />` inside `kind === 'timer' ? (...)`):

```tsx
          {kind === 'timer' ? (
            <div className="flex flex-col items-end gap-1.5">
              {todaySeconds > 0 && (
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-success">
                  Today {formatDuration(todaySeconds)} ✓
                </span>
              )}
              <HabitTimer habitId={id} />
            </div>
          ) : !dueToday ? (
```

- [ ] **Step 5: Typecheck, lint, and unit tests still pass**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: no type errors, no lint errors, all tests PASS.

- [ ] **Step 6: Visual check**

Run the dev server (`npm run dev`), open `/habits`. A timer habit with focus/manual logs today shows `Today <duration> ✓` above its Start/Stop timer. Stop&log adds time; reload shows the total increase. A timer habit with no logs today shows only the timer (no ✓ line).

- [ ] **Step 7: Commit**

```bash
git add src/app/'(app)'/habits/page.tsx src/components/habits/HabitCard.tsx
git commit -m "feat(habits): show today's logged time + DONE on timer cards"
```

---

### Task 4: Today widget — show logged duration on timer habits

**Files:**
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/components/today/HabitsDueWidget.tsx`

**Interfaces:**
- Consumes: `sumSecondsByHabit` (Task 2), `formatDuration` (Task 1).
- Produces: `HabitsDueWidget`'s `logsToday` prop rows now include `value: number | null`.

- [ ] **Step 1: Add `value` to the today habit_logs query + type** (`today/page.tsx`)

Change the query select (currently `.select('habit_id, log_date')` on the `habit_logs` fetch, ~line 51):

```ts
    supabase
      .from('habit_logs')
      .select('habit_id, log_date, value')
      .eq('user_id', userId)
      .gte('logged_at', startUtc.toISOString())
      .lt('logged_at', endUtc.toISOString()),
```

Change the `logsToday` cast type (currently `Array<{ habit_id: string; log_date: string }>`, ~line 92):

```ts
  const logsToday = (todayHabitLogsResult.data ?? []) as Array<{
    habit_id: string;
    log_date: string;
    value: number | null;
  }>;
```

No other change on this page — `loggedHabitSet`/`openHabits` still work off `habit_id`.

- [ ] **Step 2: Sum and render duration in the widget** (`HabitsDueWidget.tsx`)

Add imports:

```ts
import { sumSecondsByHabit } from '@/lib/domain/habit-logs';
import { formatDuration } from '@/lib/utils/duration';
```

Change the `HabitLog` type:

```ts
type HabitLog = { habit_id: string; log_date: string; value: number | null };
```

After `const loggedSet = new Set(logsToday.map((l) => l.habit_id));`, add:

```ts
  const secondsByHabit = sumSecondsByHabit(logsToday, today);
```

Replace the per-habit `logged` badge block. Currently:

```tsx
          {due.map((h) => {
            const logged = loggedSet.has(h.id);
            return (
```

becomes:

```tsx
          {due.map((h) => {
            const logged = loggedSet.has(h.id);
            const seconds = secondsByHabit.get(h.id) ?? 0;
            const timerLabel =
              h.kind === 'timer' && seconds > 0 ? formatDuration(seconds) : null;
            return (
```

And the badge JSX (currently `{logged && (<span ...>done</span>)}`):

```tsx
                  {logged && (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-success">
                      {timerLabel ? `${timerLabel} ✓` : 'done'}
                    </span>
                  )}
```

- [ ] **Step 3: Typecheck, lint, and unit tests still pass**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: no type errors, no lint errors, all tests PASS.

- [ ] **Step 4: Visual check**

Open `/today`. A due timer habit logged today shows `<duration> ✓` (e.g. `1h 20m ✓`) instead of the bare `done`; a logged check/counter habit still shows `done`.

- [ ] **Step 5: Commit**

```bash
git add src/app/'(app)'/today/page.tsx src/components/today/HabitsDueWidget.tsx
git commit -m "feat(today): show logged duration on due timer habits"
```

---

## Self-Review

**Spec coverage:**
- "show habit as done ✓" → Task 3 (card ✓), Task 4 (widget ✓). ✓
- "show hours logged" → `formatDuration` (Task 1) rendered in Tasks 3 & 4. ✓
- "sum multiple logs" → `sumSecondsByHabit` (Task 2), tested with N rows/day. ✓
- "both habits card + today widget" → Tasks 3 & 4. ✓
- Out-of-scope (target progress, live-add) correctly excluded. ✓

**Placeholder scan:** none — all steps carry concrete code/commands.

**Type consistency:** `sumSecondsByHabit(logs, today) → Map<string, number>` and `formatDuration(seconds) → string` are used identically in Tasks 3 and 4. `HabitLogRecord` / `logsToday` / `HabitLog` all extended with `value: number | null`, matching the helper's input type. `HabitCard` prop `todaySeconds: number` defined in Task 3 and supplied by the page in the same task.
