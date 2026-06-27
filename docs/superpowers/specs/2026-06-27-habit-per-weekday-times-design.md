# Per-Weekday Habit Times — Design

**Date:** 2026-06-27
**Status:** Approved (design), pending spec review
**Scope:** habits subsystem — revises the single `scheduled_time` feature into a per-weekday model

## Overview

A timer habit can currently hold one wall-clock time that applies to every day
it is due. This feature lets each due **weekday** carry its own time — e.g. Run
at 07:00 on Mon/Wed but 09:30 on Sat. It supersedes the single-time model
shipped earlier today (single `scheduled_time` had no times set in production
yet, so there is nothing to preserve).

## Decisions (locked during brainstorming)

1. **Per-weekday times:** each day the habit is due may have its own `"HH:MM"`.
2. **Timer-only:** only `kind = 'timer'` habits get times (unchanged from the
   single-time feature). check/counter stay in Anytime.
3. **Grouping on `/habits`:** by **earliest time of week** — the habit sits in
   the day-part of its earliest scheduled time across the week (stable
   regardless of which weekday you browse).
4. **Add form:** a **full per-day editor** at create — one time row per selected
   due day.
5. **`x_per_week` excluded:** per-weekday times apply only to `daily` and
   `weekly{days}` frequencies. `x_per_week` habits are intentionally flexible-day
   and get no scheduled times (stay in Anytime).
6. Each due day's time is **optional** (a blank row = no time that day).

## Data model

Replace `habits.scheduled_time TIME` with a JSONB map:

```
scheduled_times_json JSONB   -- nullable; { "<isoWeekday>": "HH:MM", ... }
```

- Keys are ISO weekday strings `"1"`=Mon … `"7"`=Sun. Values are `"HH:MM"` 24h.
- A weekday absent from the map = no time that day.
- Keys are always a subset of the habit's due days.
- JSONB stores the `"HH:MM"` strings verbatim, so reads return `"HH:MM"` (no
  Postgres `TIME` → `"HH:MM:SS"` serialization surprise — the reason the old
  single-time control needed truncation).

**Migration `021_habits_per_weekday_times.sql`:** add `scheduled_times_json`,
drop `scheduled_time`. The `scheduled_time` column is all-NULL in production
(verify with a count before applying), so no backfill is required; if any value
exists, migrate it into the map under each of that habit's due days. Applied to
the live PersonalJarvis DB with **explicit per-task authorization** (the drop is
destructive but the column is empty).

*Rejected alternatives:* a normalized `habit_schedules(habit_id, weekday, time)`
table (overkill for a personal app, extra joins); embedding times inside
`frequency_json` (conflates "which days" with "what time" and breaks the
existing discriminated union + `isHabitDueOn`).

## Due-days relationship

The set of editable weekdays comes from `frequency_json`:

| Frequency | Editable weekdays |
|-----------|-------------------|
| `daily` | all 7 (Mon–Sun) |
| `weekly{days}` | exactly `days` |
| `x_per_week{count}` | none (feature N/A) |

A reusable helper `dueWeekdays(frequency): number[]` returns this set (`[]` for
`x_per_week`). It is the single source of truth for both the editor rows and the
key-subset validation.

## Domain — `src/lib/domain/day-part.ts`

Add pure helpers (keep `dayPartOf`, `groupHabitsByDayPart`, `hhmm`):

```ts
export type ScheduledTimes = Record<string, string>; // "1".."7" -> "HH:MM"

// Smallest "HH:MM" among the map's values, or null if empty/null.
// "HH:MM" is zero-padded, so lexicographic min == chronological min.
export function earliestTime(times: ScheduledTimes | null | undefined): string | null;

// True when every value in the (non-empty) map is identical.
export function timesAreUniform(times: ScheduledTimes | null | undefined): boolean;
```

`dueWeekdays(frequency)` lives in `src/lib/domain/habit-frequency.ts` beside the
existing `ALL_DAYS` / `frequencyFromDays` helpers (reuse its weekday vocabulary).

Grouping on the page becomes
`groupHabitsByDayPart(cards, (c) => earliestTime(c.habit.scheduled_times_json))`.

## Schema — `src/lib/schemas/habits.ts`

- `WeekdayKeySchema = z.enum(['1','2','3','4','5','6','7'])`.
- `ScheduledTimesSchema = z.record(WeekdayKeySchema, ScheduledTimeSchema)`
  (reuse the existing `"HH:MM"` `ScheduledTimeSchema` regex for values).
- `CreateHabitFields`: drop `scheduled_time`; add
  `scheduled_times: ScheduledTimesSchema.nullable().optional()`.
- `CreateHabitSchema` refine(s):
  - non-empty `scheduled_times` ⇒ `kind === 'timer'` (path `['scheduled_times']`).
  - every key ∈ `dueWeekdays(frequency)` (path `['scheduled_times']`); this also
    rejects any times for `x_per_week` (empty due-day set).
- `UpdateHabitSchema` still derives from the un-refined `CreateHabitFields.partial()`.

## Actions — `src/lib/actions/habits.ts`

- `createHabit`: persist `scheduled_times_json` = the validated map (or null),
  only when `kind === 'timer'`.
- `updateHabit`: when `scheduled_times` is present, defensively (a) fetch the
  habit's `kind` + `frequency_json` if not in the patch, (b) force `null` when
  kind ≠ timer or frequency is `x_per_week`, (c) drop any keys not in
  `dueWeekdays(frequency)`. The inline editor sends the whole replacement map.

## UI

**`AddHabitSheet.tsx`** — when `kind === 'timer'` AND frequency is daily/weekly,
render a **per-day editor**: one labeled `<input type="time">` per selected due
day (driven by the watched `days` field). Empty rows are omitted from the
submitted map; submit sends `scheduled_times` (or null if all blank).

**`HabitTimeControl.tsx`** — the popover becomes the same per-day editor:
- One time row per due day; **Save** persists the whole map via
  `updateHabit({ id, scheduled_times })`; **Clear all** sends `null`.
- Trigger label summary: `Set times` when empty; the shared time (e.g. `07:00`)
  when `timesAreUniform`; otherwise `07:00 ·varies` (earliest + marker).
- Renders only on timer cards whose frequency is daily/weekly.

**`HabitCard.tsx`** — replace the single-time display with a compact per-day
schedule for timer habits (e.g. `MON 07:00 · WED 07:00 · SAT 09:30`), built from
`scheduled_times_json` and the due days. Weekday labels reuse the
`DayOfWeekPicker` vocabulary.

**`habits/page.tsx`** — select `scheduled_times_json` (drop `scheduled_time`);
add it to `HabitRecord`; group by `earliestTime`.

## Testing

- **Unit (TDD):** `earliestTime` (min across values, null/empty → null,
  uniform vs varied), `timesAreUniform`, `dueWeekdays` (daily→7, weekly→days,
  x_per_week→[]).
- **Schema:** timer+valid-keys passes; non-timer with times fails; a key outside
  due days fails; any times on `x_per_week` fails; malformed `"HH:MM"` fails.
- Grouping is already covered by existing `day-part` tests via the `getTime`
  accessor (now fed `earliestTime`).

## Migration safety / sequencing

This supersedes the single-time feature; all `scheduled_time` readers/writers
(schema, actions, page select, `HabitCard`, `HabitTimeControl`, `AddHabitSheet`)
are rewritten in the same change set. Because every reader is updated and the
column is empty, the `scheduled_time` drop breaks nothing. The single migration
`021` does the add + drop together (no separate sequencing needed — unlike the
emoji removal, there are no cross-page readers of `scheduled_time` beyond the
ones rewritten here).

## Out of scope

- `x_per_week` scheduling (decision 5).
- Surfacing per-weekday times on `/today` or `/plans` (those pages don't read
  the habit time today; unchanged).
- Multiple times within a single day (a different feature).
