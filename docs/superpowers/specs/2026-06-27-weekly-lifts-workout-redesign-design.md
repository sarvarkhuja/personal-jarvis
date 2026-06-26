# Workout Redesign — Weekly Lift Logger

**Date:** 2026-06-27
**Status:** Approved design, ready for implementation plan

## Goal

Replace the cut/recomp-focused workout page with a strength-progression page whose
centerpiece is **weekly rep logging of five compound lifts**. Weight and progress
photos are demoted to a once-a-week reminder. The current week is shown prominently.

## Background — current page (being replaced)

`src/app/(app)/workout/page.tsx` today renders a 30-day weight-trajectory hero
(`RecompInstrument`) plus a masonry of daily-cadence cards: `TodayLogStatus`,
`GirthRailsCard`, `MacrosCard`, `StrengthLog` (read-only PRs), `WeighInLog`,
`ProgressPhotosGrid`. The `personal_records` table is read-only (no write action) and
has no concept of a week.

## What we're building

### The five lifts

Fixed set, canonical keys and display names:

| key               | display        | bodyweight |
|-------------------|----------------|------------|
| `bench`           | BENCH PRESS    | no         |
| `squat`           | SQUAT          | no         |
| `deadlift`        | DEADLIFT       | no         |
| `overhead_press`  | OVERHEAD PRESS | no         |
| `pull_ups`        | PULL-UPS       | yes        |

### Logging model

- One entry per `(lift, week)`. Each entry stores **weight + reps**.
- **Reps is the headline** number that should climb week to week.
- Weight **pre-fills from the previous week's entry**; the user usually just confirms it
  and types the new rep count, bumping the weight only when ready.
- The trend compares **reps** vs the previous *logged* week and flags weeks where the
  weight changed (a "weight ↑/↓" note), so a rep dip caused by a heavier load reads
  honestly rather than as regression.
- Pull-ups weight is nullable: `null` = bodyweight; a value = added weight.
- No estimated-1RM. Rep-count is the focus (explicitly chosen over an e1RM model).

### Week definition

- Weeks are **Monday-anchored, UTC**, matching the existing codebase convention
  (`focus-metrics.ts` `mondayIndex` + `addDays`; ISO weekday Mon=1…Sun=7).
- `weekStart(today)` = the Monday (YYYY-MM-DD) of `today`'s week.
- The header shows the ISO-8601 week number plus the Monday→Sunday date range, e.g.
  `WEEK 26 · MON JUN 23 – SUN JUN 29`.
- All date math is SSR-stable: `today` is always passed in, never read from the clock
  (matching `workout-metrics.ts`).

## Page layout (after strip-down)

Reuses the existing `instrument-hero + masonry` skeleton
(`w-full px-4 py-8 pb-24`, header, full-width hero, `columns` masonry):

```
WORKOUT
WEEK 26 · MON JUN 23 – SUN JUN 29

┌─────────────── THIS WEEK (hero) ───────────────┐
│   five stacked lift rows — the weekly logger     │
└─────────────────────────────────────────────────┘

┌── [ WEEKLY CHECK ] ──┐   ┌── [ PROGRESSION · 8 WK ] ──┐
│ weigh-in  ✓ / pending │   │ per-lift rep sparklines    │
│ photo     ✓ / pending │   │ + reps gained over period  │
│ recent weights        │   │                            │
│ latest-photos strip   │   │                            │
└───────────────────────┘   └────────────────────────────┘
```

### Hero — stacked lift rows (`WeeklyLiftsHero`)

Card shell `rounded-lg border border-border bg-surface p-6 md:p-8`. Header rail:
`[ THIS WEEK · W26 ]` left, `JUN 23–29 · 3/5 LOGGED` right.

Five rows, one per lift, separated by `border-b border-border` (last row none). Each row:

```
BENCH PRESS    80 KG    ▏▎▍▅▆     9   ▲+1   [ edit ]
```

- left: mono uppercase lift name + weight context (`80 KG`, or `BW` / `BW+10` for pull-ups)
- a small segmented rep-bar strip of recent weeks (the Nothing bar idiom)
- the current week's reps as the large **Doto** numeral (`font-doto`)
- trend vs previous logged week: `▲+1` / `=` / `▼-1` — the single rationed color moment
  (green up / red down via `--success` / `--accent`); a "weight ↑/↓" note when the weight changed
- a ghost `[ edit ]` / `[ log ]` button opening `LiftLogSheet`
- unlogged-this-week lifts render `—` for reps and a `[ log ]` prompt

Hero is a server component; the per-row log button is the client `LiftLogSheet`.

### `WeeklyCheckCard` — the weight + photo reminder

Masonry card `[ WEEKLY CHECK ]`. Computes "logged this week?" as an entry with
`date >= weekStart(today)`.

- **WEIGH-IN** row: ✓ with weight + date, or pending; trigger reuses `BodyMetricsSheet`.
- **PHOTO** row: ✓ with date, or pending; trigger reuses `ProgressPhotoUploadSheet`.
- A tiny recent-weeks weight readout (last ~4 weekly weigh-ins + delta).
- A small latest-photos thumbnail strip (reusing the signed-URL approach already in the page).

### `ProgressionCard` — read-only history

Masonry card `[ PROGRESSION · 8 WK ]`, one card with five rows. Each lift: a segmented
rep-bar strip over the last 8 weeks, the latest reps value, and reps gained across the
period. Read-only (logging/editing happens in the hero).

## Data model & DB

New table, applied **both** as `supabase/migrations/017_weekly_lifts.sql` **and** to the
live DB via the connected Supabase MCP (the live DB drifts from migrations, so keep them
in sync). RLS policy uses `FOR ALL USING (auth.uid() = user_id)` only — matching the
existing `body_metrics` / `nutrition_logs` policies exactly.

```sql
CREATE TABLE public.weekly_lifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL CHECK (exercise IN
    ('bench','squat','deadlift','overhead_press','pull_ups')),
  week_start DATE NOT NULL,
  weight_kg NUMERIC(6,2),
  reps INT NOT NULL CHECK (reps >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, exercise, week_start)
);

CREATE INDEX idx_weekly_lifts_user_exercise
  ON public.weekly_lifts(user_id, exercise, week_start DESC);

ALTER TABLE public.weekly_lifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own weekly lifts" ON public.weekly_lifts
  FOR ALL USING (auth.uid() = user_id);
```

The `personal_records` table is left intact (no destructive drop); it is simply no longer
surfaced. All other workout tables (`body_metrics`, `nutrition_logs`, `progress_photos`)
remain.

## New / changed code

### Types — `src/types/index.ts`
- `LiftKey` union of the five keys.
- `WeeklyLift` interface: `id, user_id, exercise: LiftKey, week_start, weight_kg: number | null, reps, created_at, updated_at`.

### Schema — `src/lib/schemas/weekly-lifts.ts`
- `UpsertWeeklyLiftSchema`: `exercise` enum, `week_start` (`dateString` regex), `weight_kg`
  (`optionalNumber`), `reps` `z.number().int().nonnegative()`.
- `DeleteWeeklyLiftSchema`: `{ id: uuid }`.
- Inferred `UpsertWeeklyLiftInput` / `DeleteWeeklyLiftInput`. Mirrors `body-metrics.ts`.

### Action — `src/lib/actions/weekly-lifts.ts`
- `'use server'`, `@/lib/supabase/action` `createClient`, `requireUserId()`, `authedClient()`
  + `failed()` helpers (copy the `body-metrics.ts` shape).
- `upsertWeeklyLift(input)`: parse, upsert on `onConflict: 'user_id,exercise,week_start'`,
  set `updated_at: new Date().toISOString()`, `revalidatePath('/workout')`, return row.
- `deleteWeeklyLift(input)`: delete by `id` + `user_id`, `revalidatePath('/workout')`.

### Utils — `src/lib/utils/lift-metrics.ts` (pure, SSR-stable, TDD)
- `weekStart(date: string): string` — Monday (UTC) YYYY-MM-DD.
- `isoWeekNumber(date: string): number` — ISO-8601 week number.
- `LIFTS` — ordered const of `{ key, display, bodyweight }` for the five lifts.
- `buildLiftRows(entries: WeeklyLift[], today: string, weeks = 8)` → per lift:
  `{ lift, current: { weight, reps } | null, trend: { delta, dir } | null,
     weightChanged: boolean, history: number[] }` for the hero + progression.
- Date helpers: import the exported `formatUTCDate` from `workout-metrics.ts`; define
  small local UTC helpers (`parseUTC`, `addDays`) inside `lift-metrics.ts` as the other
  metrics modules do (`parseUTC`/`addDays` are internal to `workout-metrics.ts`, and
  `focus-metrics.ts` already defines its own `addDays`).

### Components — `src/components/workout/`
- `WeeklyLiftsHero.tsx` (server) — the stacked-row hero.
- `LiftLogSheet.tsx` (client) — react-hook-form + zod + shadcn `Sheet`, mirroring
  `BodyMetricsSheet`. Fields: **reps** (prominent) + **weight** (pre-filled from last
  week; optional "added weight" for pull-ups). Shows "last week: 80kg × 8" reference.
  Calls `upsertWeeklyLift`.
- `WeeklyCheckCard.tsx` (server) — weight + photo reminder.
- `ProgressionCard.tsx` (server) — 8-week per-lift history.

### Page — `src/app/(app)/workout/page.tsx`
- Fetch `weekly_lifts` (recent ~8 weeks for the user), `body_metrics` and `progress_photos`
  for the current week (plus a few prior weeks for the weight readout), in one `Promise.all`.
- Compute `weekStart(today)`, `isoWeekNumber(today)`, `buildLiftRows(...)`.
- Render header (with week label) → `WeeklyLiftsHero` → masonry(`WeeklyCheckCard`,
  `ProgressionCard`).

### Removed (orphaned by strip-down — files deleted)
`RecompInstrument`, `GirthRailsCard`, `MacrosCard`, `StrengthLog`, `WeighInLog`,
`TodayLogStatus`, `NutritionSheet`, `DeleteNutritionLogButton`, plus the now-unused
nutrition action/schema if nothing else imports them. **Kept and reused:**
`BodyMetricsSheet`, `ProgressPhotoUploadSheet`, `ProgressPhotosGrid`,
`DeleteBodyMetricsButton`, `DeletePhotoButton`, and the date helpers in `workout-metrics.ts`.
DB tables are all left intact.

## Testing

- TDD on `lift-metrics.ts` with vitest (`describe`/`it`/`expect`, `today` passed in,
  matching `dashboard-utils.test.ts`):
  - `weekStart` — Monday anchoring across the week, including Sunday and Monday edges,
    month/year boundaries.
  - `isoWeekNumber` — known ISO-week reference dates incl. the Jan 1 / Dec 31 edge cases.
  - `buildLiftRows` — trend up/flat/down vs previous *logged* week (skipping gaps),
    `weightChanged` flag, unlogged-this-week (`current: null`), history ordering/length.
- Manual verification: log a lift, confirm upsert + revalidation, weekly-check ✓ states,
  progression sparklines.

## Implementation notes

- **Heed `AGENTS.md`:** this is a modified Next.js — read the relevant guide in
  `node_modules/next/dist/docs/` before writing page/action/server-component code.
- Color discipline: exactly one expressive color moment per view (the trend), per the
  Nothing convention already used in `RecompInstrument` / `ExpensesView`.
- Typography: mono uppercase chrome labels (`text-[10px]`/`text-[11px]`,
  `tracking-[0.08em]`), Doto for the hero rep numerals, sans only for any single human
  sentence.

## Out of scope

- Multi-set / per-session logging, RPE, rest timers, supersets.
- Editing arbitrary past weeks from the hero (hero = current week; history is read-only).
- Restoring macros / girths / trajectory (removed; tables retained if wanted later).
- Dropping `personal_records` or any existing table.
