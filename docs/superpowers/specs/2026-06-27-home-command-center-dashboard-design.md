# Home Command-Center Dashboard — Design

- **Date:** 2026-06-27
- **Status:** Approved (design); ready for implementation plan
- **Route affected:** `/` (the `(app)` home page)
- **Supersedes:** `src/components/dashboard/` (legacy 5-tab `JarvisDashboard`)

## Problem

The app has three overlapping surfaces:

1. **`/` Home → `JarvisDashboard`** — a 5-tab CRUD dashboard (Overview / Expenses / Goals / Focus / Discipline) built on the **legacy data model**: `src/actions/*`, `focus_areas`/`focus_checkins`, `habit_completions`, `discipline_scores`, and the legacy `goals` columns (`target_value`/`current_value`/`unit`/`deadline`).
2. **`/today`** — a daily *action* surface: `DayStrip` hero + interactive due-widgets, built on the **new model** (`habit_logs`, `medication_logs`, `focus_sessions`, `events`).
3. **Standalone redesigned pages** (`/expenses`, `/goals`, `/focus`, `/habits`, `/pills`, `/plans`, `/workout`, `/body`) — each a full instrument page on the new model.

The home dashboard **duplicates pages that have already been redesigned**, on a data model the rest of the app has moved off of. Concretely:

- Two action systems: dashboard uses `@/actions/*`; everything else uses `@/lib/actions/*` (duplicate `focus.ts` and `goals.ts` exist in both).
- "Focus" means two unrelated things: dashboard `focus_areas` (daily check-in areas) vs. redesigned `/focus` (`focus_sessions` timer/Metronome).
- Goals percentage-progress (`current_value/target_value`) is **dead** in the canonical model (migration 014 dropped progress columns + the `goal_progress` view); the new model expresses position as a **time countdown to `target_date`** + a status ledger.

## Decisions (locked with user)

1. **Home `/` becomes a read-only command-center overview** — a "bridge view" that surfaces the highest-value glance per subsystem and links into each dedicated page. No duplicated CRUD/forms. Single scroll, Nothing "instrument hero + masonry."
2. **Drop `focus_areas` + `discipline_scores` entirely.** The dashboard draws only from canonical new models: habits, goals, expenses, focus sessions, pills, events.
3. **Hero = the 30-day habit-consistency instrument** (per-day completion field + Doto done/due-today readout, green at all-done). This is the backbone "training system" signal and is visually distinct from `/today`'s day-clock hero. (A composite score hero is explicitly avoided since `discipline_scores` is dropped.)

## Goals / Non-goals

**Goals**
- Replace the legacy `JarvisDashboard` with a read-only overview on the canonical models.
- Reuse existing pure domain helpers and presentational widgets; build new read-only glances only where none exists.
- Keep home visually distinct from `/today` (standing/trends vs. today's actions).

**Non-goals (YAGNI)**
- No CRUD on home (add/edit/delete/toggle/log forms stay on dedicated pages).
- No changes to `/today` or the dedicated pages.
- No new tracking concepts; no composite "discipline score."
- DB-level table drops are an **optional follow-up**, not part of this change.

## Architecture

### A. Teardown

- **Delete** `src/components/dashboard/**` (`JarvisDashboard.tsx` + `tabs/{Overview,Expenses,Goals,Focus,Discipline}Tab.tsx`).
- **Rewrite** `src/app/(app)/page.tsx` to fetch the new models and render the new home.
- **Retire legacy-only code** *after verifying no remaining imports*: `src/actions/discipline.ts` (dashboard-only). Verify before deleting anything shared:
  - `grep -rn "@/actions/discipline" src` → expect 0 after teardown.
  - `grep -rn "@/actions/focus\b" src` and `@/actions/goals` → confirm whether the legacy `src/actions/focus.ts` / `src/actions/goals.ts` are still referenced anywhere outside the deleted dashboard; delete only those with 0 references.
  - **Keep `src/actions/expenses.ts`** — it is imported by the canonical `/expenses` (`ExpensesView`).
- **Do not** touch DB tables in this change. Record a follow-up to drop `focus_areas`, `focus_checkins`, `discipline_scores` (and evaluate `habit_completions`) once no code references them.

### B. Data layer — `src/app/(app)/page.tsx` (server component)

Auth via `requireUserId()`. Fetch `profiles.display_name, timezone`; compute `today = toUserDate(new Date(), profile.timezone ?? 'UTC')` (`@/lib/domain/timezone`). Run all subsystem queries in `Promise.all`, scoped `.eq('user_id', userId)`.

| Subsystem | Query (new model) | Derivation → widget |
|---|---|---|
| **Habits (hero)** | `habits(id,name,emoji,frequency_json,archived_at,is_active,created_at).is('archived_at',null)` + `habit_logs(habit_id,log_date).gte('log_date', addDaysISO(today,-60))` | Build `HabitForModel[]` (dedupe log dates per habit via `Set` / `groupLoggedHabitIdsByDate`), then `buildConsistencyModel(habits, today, 30)` → `{ doneToday, dueToday, days[], perfectDays, best }` |
| **Goals** | `goals(id,title,status,target_date)` | `topGoalsNearestTarget(goals, 3, today)` + `countdownFor` per goal; `normalizeStatus` for the active count/overdue |
| **Expenses** | `expenses(amount,category,date).gte('date', sixMonthsAgoStr)` | `aggregateExpensesByMonth` + `lastNMonthKeys(6)`; month total, delta vs prev month, 6-mo sparkline |
| **Focus** | `focus_sessions(id,started_at,ended_at,planned_minutes,completed,intent).gte('started_at', sinceIso)` | map → `FocusSessionLite` (same as `/focus`), `buildFocusMetrics(sessions, today)` → `.week`, `.streak` |
| **Pills** | `medications(id,name).is('archived_at',null)` + `medication_logs(medication_id,log_date).gte('log_date', addDaysISO(today,-6))` | today: taken `X`/total `Y`; 7-day adherence cells |
| **Events** | `events(id,title,starts_at,ends_at,kind)` bounded by `userDayBounds(today, tz)`..end-of-tomorrow | today/tomorrow agenda |

All listed helpers are **pure and SSR-safe** (no `Date.now()`), so derivation runs in the server component without hydration risk.

### C. Components — `src/components/home/`

Chrome reuses `WidgetCard` / `WidgetCount` / `WidgetLink` / `WidgetEmpty` (`@/components/today/WidgetCard`). All home widgets are **read-only** (no mutation buttons) — this is the primary distinction from `/today`.

**Reused as-is (read-only, already exist):**
- **Hero — `HabitsConsistencyInstrument`** (`@/components/habits/HabitsConsistencyInstrument`), props `{ model, windowDays: 30 }`. Rendered full-width above the masonry. Home wraps it with a header-right `→ /habits` link (add a thin wrapper or pass a link slot if the component lacks one; keep the change minimal and non-breaking for `/habits`).
- **`TopGoalsWidget`** (`@/components/today/TopGoalsWidget`), props `{ goals, today }` — top-3 nearest target, tone dot + `countdownFor` label, `ALL → /goals`. Read-only.
- **`UpcomingEventsWidget`** (`@/components/today/UpcomingEventsWidget`), props `{ todayEvents, tomorrowEvents, tz }` — `CALENDAR → /plans`. Read-only.

**New read-only glance widgets (no equivalent exists; built on `WidgetCard`):**

1. **`ExpensesGlance`** — header `[ SPEND · {MON} ]`, `→ /expenses`.
   - Props: `{ thisMonthTotal: number; delta: number; prevMonthTotal: number; trend: { key: string; total: number; isCurrent: boolean }[] }`.
   - Renders: large `formatUzs(thisMonthTotal)`; signed delta chip `formatUzsCompact(Math.abs(delta))` — `text-success` when `delta < 0` (spending down), neutral otherwise, hidden when `prevMonthTotal === 0`; 6-bar segmented sparkline (current month bar `bg-warning`, others `bg-border-visible`).
   - Empty: `WidgetEmpty` "No spend this month".

2. **`FocusGlance`** — header `[ DEEP WORK · THIS WEEK ]`, `→ /focus`.
   - Props: `{ weekTotalMin: number; weekAvgMin: number; bars: { min: number; isToday: boolean }[]; streakCount: number }` (from `metrics.week` / `metrics.streak`).
   - Renders: mono big `formatMinutes(weekTotalMin)` (e.g. `6h 20m`); `{streakCount}D STREAK` chip; Mon–Sun bars (today highlighted).
   - Empty: "No sessions this week".
   - Needs a small `formatMinutes(min)` util (mirror `/focus`'s `fmtMin`: `<60 → "Nm"`, else `"Hh Mm"`). Place in `@/lib/utils/focus-metrics` if not already exported, else a tiny local helper.

3. **`PillsGlance`** — header `[ PILLS ]`, `→ /pills`.
   - Props: `{ taken: number; total: number; week: { date: string; taken: number; total: number; isToday: boolean }[] }`.
   - Renders: mono `taken/total` (green when `taken === total && total > 0`); 7-day adherence cells (filled when all taken that day, partial tint otherwise, today outlined).
   - Empty: "No medications".

### D. Layout

Page wrapper `w-full px-4 py-8` (matches other pages). Top header rail (`HomeHeader`): mono `JARVIS` H1 + `{DAY} · {DATE}` + optional avatar initial (reuse the established header treatment). Then:

```
HERO (HabitsConsistencyInstrument)  — full width, rounded-lg border border-border bg-surface p-6 md:p-8
MASONRY: gap-4 lg:columns-2 xl:columns-3
  cards: mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6
  order: GOALS · EXPENSES · FOCUS · PILLS · AGENDA
```

Card headers are Space Mono bracket labels `[ TITLE ]` `text-[11px] uppercase tracking-[0.08em] text-text-secondary` with a header-right `WidgetLink`. No shadows; flat surfaces; one accent (red) reserved for overdue goals / urgent only; one Doto moment (the hero number). Tokens per `nothing-design/references/tokens.md`.

### E. Distinctness from `/today`

| | `/today` | `/` (home) |
|---|---|---|
| Hero | `DayStrip` day-clock, "open loops" now | habit 30-day **consistency** field |
| Flavor | **action** (log/toggle buttons) | **read-only standing & trends** |
| Focus card | minutes **today** + last session | minutes **this week** + streak |
| Pills card | due-today toggles | today X/Y + 7-day **adherence** |
| Expenses | — (not on today) | month total + delta + 6-mo trend |

Modest overlap (`TopGoalsWidget`, `UpcomingEventsWidget` appear on both) is acceptable: they are already read-only glances appropriate to both surfaces, and reusing them avoids reinventing list widgets.

## Error / empty / loading states

- Each widget renders a `WidgetEmpty` mono line when its dataset is empty (no toasts, no illustrations — per Nothing anti-patterns).
- Hero with `totalHabits === 0`: em-dash readout + "No habits yet" sentence.
- Server-component data fetch failures fall back to empty arrays (`?? []`), mirroring the current page's `.data ?? []` pattern.

## Testing strategy (TDD)

- The heavy derivations (`buildConsistencyModel`, `buildFocusMetrics`, `topGoalsNearestTarget`, `countdownFor`, `aggregateExpensesByMonth`) are already covered by existing domain-helper unit tests — reuse, do not duplicate.
- For **new** shaping logic introduced on home (prev-month-key rollover, expense delta sign, 7-day pill adherence cell building, `formatMinutes`), write focused unit tests first against pure helper functions (extract any non-trivial derivation out of the JSX into a testable `@/lib/...` or `@/components/home/*-data.ts` function).
- Build verification: `tsc`, lint, and existing test suite green before completion.

## Key gotchas (carried from subsystem map)

- **Timezone:** compute `today` via `toUserDate(new Date(), profile.timezone ?? 'UTC')`. Never bucket by raw UTC. Pass `today` as `YYYY-MM-DD` to all helpers.
- **habit_logs multiplicity:** dedupe dates per habit with a `Set` (or `groupLoggedHabitIdsByDate`) before counting/rendering markers — multiple rows/day are legitimate.
- **Goals `normalizeStatus`:** collapse legacy `'completed'` → `'done'` before active counts; `target_date` is the new column (not legacy `deadline`).
- **Expenses prev-month key:** handle January rollover (`month===1 ? prevYear-12 : ...`); compute month keys via string math for SSR stability.
- **Focus `durationMin`:** `completed → planned_minutes`; aborted → elapsed; live → 0. Only completed sessions count toward focused/week minutes.
- **Revalidation:** `addExpense`/`deleteExpense` already `revalidatePath('/')`. Add `revalidatePath('/')` to the mutations in `src/lib/actions/events.ts` so the home agenda stays fresh (currently only `/plans` + `/today`). Confirm habit/pill/focus/goal mutations also revalidate `/` (add where missing).

## File-by-file change list

**New**
- `src/components/home/HomeHeader.tsx`
- `src/components/home/ExpensesGlance.tsx`
- `src/components/home/FocusGlance.tsx`
- `src/components/home/PillsGlance.tsx`
- `src/components/home/home-data.ts` (pure shaping helpers + tests sibling) — only if derivations warrant extraction
- tests for new pure helpers

**Rewrite**
- `src/app/(app)/page.tsx` (server fetch on new models + compose hero + masonry)

**Edit (minimal)**
- `src/lib/actions/events.ts` — add `revalidatePath('/')`
- (if needed) thin link slot on the hero wrapper; `formatMinutes` export

**Delete**
- `src/components/dashboard/JarvisDashboard.tsx`
- `src/components/dashboard/tabs/*.tsx`
- `src/actions/discipline.ts` (after grep confirms 0 refs); legacy `src/actions/focus.ts` / `src/actions/goals.ts` only if 0 refs

## Out of scope / follow-ups

- DB migration to drop `focus_areas`, `focus_checkins`, `discipline_scores` (+ evaluate `habit_completions`) and the legacy `goals` columns once code references are gone.
- Removing legacy types in `@/types` (`FocusArea`, `FocusCheckin`, `DisciplineScore`, legacy `Goal`) after teardown.
- Any change to `/today` or dedicated pages.
