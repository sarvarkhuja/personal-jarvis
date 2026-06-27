# PLAN

Atomic tasks. Ralph completes one per iteration. `[HUMAN]` tasks pause the loop.

---

## Phase 0 — Harness


- [ ] Add `pnpm` workspace config, ESLint, Prettier, lint-staged, husky pre-commit running `pnpm typecheck`.
- [ ] Install if not installed `zod`, `date-fns`. Create `lib/schemas/` and `lib/domain/` empty directories with index files.

## Phase 2 — Habits

- [ ] Migration: `habits` + `habit_logs` tables per SPEC, indices, RLS.
- [ ] Regenerate types.
- [ ] `lib/domain/schedule.ts` — pure function `isHabitDueOn(frequency, date)` for daily / weekly / x_per_week. Unit tests covering edge cases (week boundaries, x_per_week mid-week).
- [ ] `lib/domain/streak.ts` — given sorted log dates and frequency, return `{ currentStreak, longestStreak, completionRate30d }`. Unit tests including: gap days that are not due, all-due-and-done, all-due-and-missed.
- [ ] `lib/domain/timezone.ts` — `toUserDate(utc, tz)` returns `YYYY-MM-DD` in user TZ. `userDayBounds(date, tz)` returns the UTC start/end of that user-local day. Unit tests including DST and non-DST zones.
- [ ] Server actions `lib/actions/habits.ts`: `createHabit`, `archiveHabit`, `logHabit`, `unlogHabit`, `updateHabit`. Zod schemas. RLS-aware. Tests including "user B cannot log to user A's habit."
- [ ] UI: `(app)/habits/page.tsx` listing all active habits with current streak. Add habit dialog. Edit/archive via dropdown.
- [ ] UI: today-view widget that lists habits due today, with a quick-tap log control per kind (checkbox / +1 stepper / start-timer button).
- [ ] Timer kind: client component, persists running state to `localStorage`, on stop creates a `habit_log` with elapsed seconds. Unit test the elapsed-time calculation.
- [ ] E2E test: create a daily checkbox habit, log it, verify streak = 1, verify it shows on `/today`.
- [ ] RLS test (mandatory): seed two users; user A's habit is invisible to user B via API.

## Phase 3 — Medications

- [ ] Migration: `medications` + `medication_logs` per SPEC.
- [ ] Regenerate types.
- [ ] Domain: `nextDoseTime(schedule, now, tz)` returns the next scheduled time. Unit tests across day boundaries.
- [ ] Domain: `supplyDaysRemaining(supply_count, schedule)` — divides by daily dose count. Unit tests.
- [ ] Server actions: `createMedication`, `logDose` (taken), `skipDose`, `refill` (sets supply_count), `updateMedication`, `archiveMedication`. RLS tests.
- [ ] UI: `(app)/pills/page.tsx` — list of meds with next dose, supply warning if low.
- [ ] UI: today-view widget for pills due today. Each scheduled time gets its own row: pending / taken / skipped state.
- [ ] Low-supply warning component appears on `/today` when any med has `supplyDaysRemaining ≤ supply_warn_days`.
- [ ] E2E test: create a med with twice-daily schedule, log one dose, verify second still pending; refill and verify warning clears.

## Phase 4 — Goals

- [ ] Migration: `goals` per SPEC, including self-FK and `linked_habit_id`.
- [ ] Regenerate types.
- [ ] Server actions: `createGoal`, `updateGoal`, `setGoalStatus`, `linkGoalToHabit`, `addSubGoal`. RLS tests.
- [ ] Postgres view `goal_progress` that, for each goal with `linked_habit_id`, computes count of logs against `progress_target`. Read in goals UI.
- [ ] UI: `(app)/goals/page.tsx` — tree view of goals, sub-goals nested. Filter by status. Add/edit dialog with optional habit link and target.
- [ ] UI: today-view widget showing top 3 active goals nearest to target_date.
- [ ] E2E test: create goal "read 12 books" linked to habit "read 30min", log 12 sessions, verify auto-progress shows 100%.

## Phase 5 — Future plans / events

- [ ] Migration: `events` per SPEC.
- [ ] Regenerate types.
- [ ] Server actions: `createEvent`, `updateEvent`, `deleteEvent`. RLS tests.
- [ ] UI: `(app)/plans/page.tsx` — month grid + week list. Hand-rolled, not FullCalendar (keeps deps minimal). Click a day to add event.
- [ ] UI: today-view widget showing today's + tomorrow's events.
- [ ] E2E test: add an event for tomorrow, verify it appears in today's "tomorrow" widget.

## Phase 6 — Focus mode

- [ ] Migration: `focus_sessions` per SPEC.
- [ ] Regenerate types.
- [ ] Server actions: `startFocusSession`, `endFocusSession` (called on completion or abort). RLS tests.
- [ ] UI: `(app)/focus/page.tsx` — large timer, configurable minutes (default 25), optional intent text, optional link to goal/habit. Big "Start" button.
- [ ] Client timer logic: ticks once per second, beep + browser notification on completion (with permission prompt). Aborting writes `completed=false`.
- [ ] On completion, if `linked_habit_id` is a timer-kind habit, also create a `habit_log` for it.
- [ ] UI: today-view widget showing total focus minutes today + last session.
- [ ] E2E test: start 1-minute session (override min for tests), wait for completion, verify session row written and linked habit logged.

## Phase 7 — Today dashboard + polish

- [ ] Postgres view `today_view` that combines today's: habit due states, meds due states, focus session totals, top-3 goals, today/tomorrow events. Single query.
- [ ] Refactor `(app)/today/page.tsx` to a server component that reads `today_view` once and passes data to widget components. Verify only one DB round-trip on page load (test with Supabase log).
- [ ] Loading skeletons for `/today` widgets.
- [ ] Empty states for every list page (habits, pills, goals, plans).
- [ ] Keyboard shortcuts: `g h` → habits, `g p` → pills, `g g` → goals, `f` → focus, `t` → today.
- [ ] Dark mode toggle stored in `profiles.theme`.
- [ ] Export action: download all user data as a single JSON file. Server action streams from each table filtered by `user_id`.
- [ ] Delete account flow: server action that calls admin client to delete the auth user (cascades to all data via FKs).
- [ ] Add Sentry or equivalent error monitoring (optional, mark `[HUMAN]` if the user wants this).

---

## Done log

(Ralph appends one line per completed task: `YYYY-MM-DD <task title>`)
