# Surface logged time on timer habits

## Problem

When a focus session completes with a linked timer habit, `endFocusSession`
(`src/lib/actions/focus.ts`) already inserts a `habit_log` with
`value = planned_minutes × 60` seconds. The logging works, but the UI never
shows it:

- On `/habits`, the timer `HabitCard` always renders a fresh `Start / 00:00:00`
  timer. It ignores `doneToday` and never shows accumulated time. The page query
  doesn't even fetch `value`.
- On `/today`, a logged timer habit flips to `done` (it's in `loggedSet`) but no
  time is shown.

Users can't see that a habit was logged by a focus session, how much time was
logged, or the total when a habit is logged several times in a day.

## Goal

For **timer-kind** habits, surface today's total logged time (summed across all
logs for the day — focus-session auto-logs plus manual timer logs) with a DONE ✓
marker, on both the Habits page card and the Today "Habits due" widget. Keep the
existing manual Start/Stop timer.

`habit_log.value` is stored in **seconds** for timer habits (focus: seconds via
`planned_minutes × 60`; manual `HabitTimer`: elapsed seconds). Summing is a plain
reduce over the day's rows — timer habits legitimately have multiple rows per day
(see the `groupLoggedHabitIdsByDate` note in `src/lib/domain/habit-logs.ts`).

## Design

### Pure helpers (unit-tested)

- `sumSecondsByHabit(logs, today)` in `src/lib/domain/habit-logs.ts` — given rows
  of `{ habit_id, log_date, value }`, return `Map<habit_id, number>` summing
  `value` where `log_date === today`, coalescing null `value` to 0. Both pages use
  this single map builder.
- `formatDuration(seconds)` in a small util (`src/lib/utils/duration.ts`) →
  `"1h 20m"` when ≥ 3600 (dropping ` 0m`), `"20m"` when ≥ 60, `"45s"` otherwise.

### Data

- **`/habits` (`app/(app)/habits/page.tsx`)**: add `value` to the `habit_logs`
  select. Build the map via `sumSecondsByHabit(logs, today)`. Pass `todaySeconds`
  (default 0) into each `HabitCard`.
- **`/today` (`app/(app)/today/page.tsx`)**: add `value` to the `habit_logs`
  select; pass the enriched rows to `HabitsDueWidget`, which sums per habit via
  the same helper.

Only timer-kind habits render a duration. Counter/check `value` is a count, not
seconds, and keeps existing treatment.

### Habits card (`components/habits/HabitCard.tsx`)

New prop `todaySeconds: number` (0 for non-timer / no logs). For `kind === 'timer'`
the primary-row right slot becomes a vertical stack:

```
Today 1h 20m ✓      ← formatDuration(todaySeconds); ✓ + total shown when > 0
[ 00:00:00 ] Start  ← existing <HabitTimer />, unchanged
```

The total is server-rendered. After a manual Stop&log (`logHabit` →
`revalidatePath`) or a focus session completing elsewhere (`endFocusSession`
already revalidates `/habits`), the total refreshes on reload. The live timer and
the accumulated total stay separate: the timer counts the in-progress session; the
total jumps when Stop logs it.

### Today widget (`components/today/HabitsDueWidget.tsx`)

For a logged **timer** habit, show the summed duration (`1h 20m ✓`) in place of the
bare `done` badge. Non-timer habits keep `done`.

## Testing

- Unit: `formatDuration` (hours/minutes/seconds boundaries, dropping `0m`),
  `sumTodaySeconds` including **multiple logs on one day** (the core of "add all
  times") and null-value coalescing.
- Verify existing habit/focus tests still pass.

## Out of scope (YAGNI)

- No target/progress bar (habits have `target`/`unit` in schema, but not wired to
  these views).
- No live-adding of the running timer's elapsed seconds into the displayed total.
