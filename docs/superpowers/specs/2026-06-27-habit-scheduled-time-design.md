# Habit Scheduled Time + Emoji Removal — Design

**Date:** 2026-06-27
**Status:** Approved (design), pending spec review
**Scope:** `/habits` page and the habits subsystem

## Overview

Add an optional clock time (`scheduled_time`) to **timer-kind** habits so the
user can see "what to do in which part of the day." The habits page groups
cards under part-of-day headers (Morning / Afternoon / Evening / Night /
Anytime) derived from each habit's time. In the same pass, remove the habit
**emoji** concept entirely — UI and database column.

## Decisions (locked during brainstorming)

1. **Time model:** a specific wall-clock time per habit, format `"HH:MM"`,
   stored as a Postgres `TIME` column. Optional.
2. **Kind gating:** only `kind = 'timer'` habits may have a `scheduled_time`.
   `check` / `counter` habits are always Anytime.
3. **Layout:** group the habits list by part of day, derived from each habit's
   time. Untimed habits → **Anytime**.
4. **Editing:** an inline time control on each timer card (set / change /
   clear), plus the time field in the Add-habit form. No full edit sheet.
5. **Emoji:** remove from the UI **and drop the `habits.emoji` column**.
6. **Headers:** plain mono text, no glyphs/emoji.

## Part-of-day buckets

Derived from the `"HH:MM"` string — no timezone math, because `TIME` is a
wall-clock value with no date or zone.

| Bucket    | Range (24h)        | Notes                         |
|-----------|--------------------|-------------------------------|
| Morning   | 05:00 – 11:59      |                               |
| Afternoon | 12:00 – 16:59      |                               |
| Evening   | 17:00 – 21:59      |                               |
| Night     | 22:00 – 04:59      | wraps midnight                |
| Anytime   | no time set (null) | always rendered last          |

Section render order: Morning → Afternoon → Evening → Night → Anytime. Empty
sections are not rendered.

## Architecture

### 1. Database — migration `019_habits_time_and_drop_emoji.sql`

```sql
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  DROP COLUMN IF EXISTS emoji;
```

Nullable; no backfill (existing habits → Anytime). Applied to the live
PersonalJarvis DB after merge (live DB carries dashboard-created objects not in
migrations — introspect, don't assume). Dropping `emoji` is irreversible;
existing emoji values are discarded (accepted).

### 2. Domain — `src/lib/domain/day-part.ts` (new, pure, TDD'd)

The single source of truth for bucketing and grouping. Pure functions, unit
tested first.

```ts
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';

export const DAY_PART_ORDER: DayPart[];           // render order incl. anytime
export const DAY_PART_LABEL: Record<DayPart, string>;  // 'MORNING', …

// Bucket an "HH:MM" (or null) into a DayPart.
export function dayPartOf(time: string | null): DayPart;

// Group habits into ordered, non-empty sections; within a section sort by
// time ascending. Night sorts with after-midnight hours shifted +24 so the
// order reads 22:00 → 23:00 → 00:00 → 04:00. Anytime sorts by created order.
export function groupHabitsByDayPart<T extends { scheduledTime: string | null }>(
  habits: T[],
): Array<{ part: DayPart; label: string; habits: T[] }>;
```

**Test cases (write first):** boundary edges (04:59→night, 05:00→morning,
11:59→morning, 12:00→afternoon, 16:59/17:00, 21:59/22:00); null→anytime;
midnight-wrap sort within Night; Anytime always last; empty sections dropped;
sections in canonical order.

### 3. Schema — `src/lib/schemas/habits.ts`

- Add a reusable time validator: `"HH:MM"` 24h, e.g.
  `z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)`.
- `CreateHabitSchema`: add `scheduled_time: <time>.nullable().optional()`;
  **remove** `emoji`. Add a refine: `scheduled_time == null || kind === 'timer'`
  (message: "Only timer habits can have a scheduled time").
- `UpdateHabitSchema` (derived `.partial()`): `scheduled_time` present-and-null
  clears the time.

### 4. Actions — `src/lib/actions/habits.ts`

- `createHabit`: insert `scheduled_time: parsed.kind === 'timer' ? (parsed.scheduled_time ?? null) : null`;
  remove the `emoji` insert.
- `updateHabit`: add `if (parsed.scheduled_time !== undefined) patch.scheduled_time = parsed.scheduled_time;`
  remove the `emoji` patch. Defensive guard: if the resulting/known kind is not
  `timer`, force `scheduled_time` to null (fetch current kind when the patch
  omits it).

### 5. UI

**`AddHabitSheet.tsx`**
- Remove the Emoji input (and its grid cell / default value / submit field).
- Add a **Time** field (`<input type="time">`, optional) shown **only when
  `kind === 'timer'`** (watch the kind field). Wire `scheduled_time` into the
  form values and the `createHabit` call.

**`HabitCard.tsx`**
- Remove the emoji span; props lose `emoji`.
- Add `scheduledTime: string | null` prop. For timer habits, render the new
  `HabitTimeControl`. For non-timer habits, no time control.

**`HabitTimeControl.tsx` (new client component)**
- Mirrors the `ColorPicker` popover pattern (`Popover` / `PopoverTrigger` /
  `PopoverContent`, `'use client'`).
- Trigger shows `07:30` when set, `Set time` when null (mono caps styling).
- Content: a `<input type="time">` + **Save** and **Clear** actions; calls
  `updateHabit({ id, scheduled_time })` (Clear sends `null`). Closes on success;
  surfaces errors inline.

**`habits/page.tsx`**
- Add `scheduled_time` to the habits `.select(...)` and to `HabitRecord`;
  remove `emoji` from both.
- Replace the single masonry grid with `groupHabitsByDayPart(...)`: render one
  section per group — a mono header (`LABEL · N`) followed by the masonry
  columns of that section's cards. Keep an outer `data-testid="habits-list"`
  wrapper so existing selectors still resolve; add `data-testid` per section
  (e.g. `habits-section-morning`).
- The `HabitsConsistencyInstrument` hero is unchanged.

### 6. Emoji removal — exact blast radius (live readers only)

Drop the column, so every **live** reader/writer of `habits.emoji` must change:

| File | Change |
|------|--------|
| `src/lib/schemas/habits.ts` | remove `emoji` field |
| `src/lib/actions/habits.ts` | remove emoji insert (L61) + patch (L89) |
| `src/app/(app)/habits/page.tsx` | drop from select, `HabitRecord`, card prop |
| `src/app/(app)/plans/page.tsx` | drop from select (L74), type (L100), maps (L112, L161) |
| `src/app/(app)/today/page.tsx` | drop from select (L46), model type (L89) |
| `src/components/habits/HabitCard.tsx` | remove emoji display + prop |
| `src/components/habits/AddHabitSheet.tsx` | remove emoji input |
| `src/components/plans/WeekList.tsx` | L120 `h.emoji ?? (…)` → drop emoji, keep `✓`/`○` |
| `src/components/plans/MonthGrid.tsx` | L128 `h.emoji ?? '✓'` → `'✓'`; drop prop (L18) |
| `src/components/today/HabitsDueWidget.tsx` | L54 `h.emoji ?? '·'` → `'·'`; drop prop (L9) |

### Out of scope (explicitly not touched)

- **`src/components/dashboard/JarvisDashboard.tsx` + `tabs/*` + `src/actions/discipline.ts` + `src/types/index.ts`** — the legacy dashboard is **dead code**: `JarvisDashboard` is defined but never imported or routed. Its `habit.emoji` / `area.emoji` references and the emoji-writing `discipline.ts` insert are unreachable. Dropping the column does not affect the live app; cleaning this dead subsystem is deferred.
- **Expense category icons** (`ExpensesView.tsx`, `ExpensesTab.tsx`) and **focus-area icons** (`FocusTab.tsx`, `OverviewTab.tsx`) — hardcoded UI icons, unrelated to `habits.emoji`. Left as-is.
- No full habit edit sheet; no `/today` regrouping by part of day (time only changes display where listed above).

## Testing

- **Unit (primary, TDD):** `src/lib/domain/__tests__/day-part.test.ts` covering
  the cases above.
- **Schema:** a couple of assertions that a non-timer habit with a time fails
  the refine, and a valid timer-with-time passes.
- **E2e (optional, follow-up):** create a timer habit with a time → lands in the
  right section; inline set/clear on a card. Noted, not required for the first
  cut.

## Verification gates

- `npm run typecheck`, `npm run lint`, `npm test` green.
- Build succeeds (column drop won't break any live query — verified by the
  audit above).
- Migration applied to live DB and `scheduled_time` confirmed present, `emoji`
  confirmed gone.
