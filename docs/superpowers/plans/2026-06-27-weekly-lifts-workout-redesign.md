# Weekly Lift Logger — Workout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the recomp-focused workout page with a weekly rep-logger for five compound lifts (Bench, Squat, Deadlift, Overhead Press, Pull-ups), with weight + photo demoted to a once-a-week reminder and the current week shown prominently.

**Architecture:** A new `weekly_lifts` table holds one (lift, week) row of weight + reps. Pure SSR-stable utilities in `lift-metrics.ts` compute the Monday-anchored week, ISO week number, and per-lift trend/history rows. The server page renders a stacked-row hero (`WeeklyLiftsHero`) plus two masonry cards (`WeeklyCheckCard`, `ProgressionCard`); logging happens through a client `LiftLogSheet` mirroring the existing `BodyMetricsSheet`.

**Tech Stack:** Next.js 16 (App Router, RSC + server actions), React 19, Supabase (Postgres + RLS), Zod v4, react-hook-form, shadcn/@base-ui components, Tailwind v4, Vitest.

## Global Constraints

- **Git: stay on `main`. Do NOT create branches or worktrees. Do NOT run `git commit` or `git add` at any point in this plan.** Each task ends with verification (typecheck/test), not a commit.
- **DB change IS wanted:** apply the new table to the live Supabase DB via the connected Supabase MCP (this is the user's explicit request; it is not a git commit). Also write the migration file so migrations stay in sync.
- **Heed `AGENTS.md`:** this is a modified Next.js (`next@16.2.1`). Before writing any page / server-action / server-component code, read the relevant guide under `node_modules/next/dist/docs/`.
- **Color discipline:** exactly one expressive color moment per view — here the trend arrow (green `text-success` up / red `text-accent` down). Everything else is mono greyscale.
- **Typography:** mono uppercase chrome labels (`text-[10px]`/`text-[11px]`, `tracking-[0.08em]`); Doto (`font-doto`) only for the hero rep numerals; sans only for a single human sentence (none required here).
- **Date math is SSR-stable:** `today` is always passed in (`new Date().toISOString().split('T')[0]` at the page boundary), never read from the clock inside utilities.
- **Security:** the delete action MUST filter by `user_id` and rely on RLS; never trust a client-supplied id alone (mirrors `body-metrics.ts`).

---

## File Structure

**Create:**
- `supabase/migrations/017_weekly_lifts.sql` — table DDL (also applied to live DB via MCP)
- `src/lib/utils/lift-metrics.ts` — constants + week/trend pure logic
- `src/lib/utils/__tests__/lift-metrics.test.ts` — unit tests
- `src/lib/schemas/weekly-lifts.ts` — Zod schemas
- `src/lib/actions/weekly-lifts.ts` — `upsertWeeklyLift` / `deleteWeeklyLift`
- `src/components/workout/RepSparkline.tsx` — shared rep bar strip
- `src/components/workout/LiftLogSheet.tsx` — client logging sheet
- `src/components/workout/WeeklyLiftsHero.tsx` — stacked-row hero
- `src/components/workout/WeeklyCheckCard.tsx` — weight + photo reminder
- `src/components/workout/ProgressionCard.tsx` — 8-week history

**Modify:**
- `src/types/index.ts` — add `WeeklyLift`
- `src/app/(app)/workout/page.tsx` — rewrite data fetch + layout

**Delete (orphaned by strip-down):**
- `src/components/workout/RecompInstrument.tsx`
- `src/components/workout/GirthRailsCard.tsx`
- `src/components/workout/MacrosCard.tsx`
- `src/components/workout/StrengthLog.tsx`
- `src/components/workout/WeighInLog.tsx`
- `src/components/workout/TodayLogStatus.tsx`
- `src/components/workout/NutritionSheet.tsx`
- `src/components/workout/DeleteNutritionLogButton.tsx`
- `src/components/workout/ProgressPhotosGrid.tsx`

**Kept & reused:** `BodyMetricsSheet`, `ProgressPhotoUploadSheet`, `DeleteBodyMetricsButton`, `DeletePhotoButton`, and `formatUTCDate` from `workout-metrics.ts`.

---

## Task 1: Database table `weekly_lifts`

**Files:**
- Create: `supabase/migrations/017_weekly_lifts.sql`
- Live DB: apply via Supabase MCP

**Interfaces:**
- Produces: table `public.weekly_lifts(id, user_id, exercise, week_start, weight_kg, reps, created_at, updated_at)`, unique `(user_id, exercise, week_start)`, RLS `FOR ALL USING (auth.uid() = user_id)`.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/017_weekly_lifts.sql`:

```sql
-- Weekly lift logger: one row per (user, lift, week). Reps is the tracked headline;
-- weight pre-fills from the prior week. Replaces the read-only personal_records view.
CREATE TABLE public.weekly_lifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL CHECK (exercise IN
    ('bench','squat','deadlift','overhead_press','pull_ups')),
  week_start DATE NOT NULL,           -- Monday (UTC) of the week
  weight_kg NUMERIC(6,2),             -- nullable; null = bodyweight (pull-ups)
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

- [ ] **Step 2: Apply to the live DB via the Supabase MCP**

Load the Supabase MCP tools, authenticating if required:

```
ToolSearch query: "select:mcp__plugin_supabase_supabase__authenticate,mcp__plugin_supabase_supabase__complete_authentication"
```
If a `list_tables` / `execute_sql` / `apply_migration` tool is not yet available, run `ToolSearch query: "supabase apply migration execute sql list tables"` to discover the exact tool names, then call `authenticate` (follow the returned URL) + `complete_authentication` first.

Apply the migration: call the Supabase MCP `apply_migration` tool with name `017_weekly_lifts` and the SQL body above (or `execute_sql` with the same SQL if `apply_migration` is unavailable).

Fallback if MCP auth cannot be completed: tell the user to paste `017_weekly_lifts.sql` into the Supabase dashboard SQL editor and run it, then continue.

- [ ] **Step 3: Verify the table exists**

Via the Supabase MCP `execute_sql` tool, run:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'weekly_lifts'
ORDER BY ordinal_position;
```
Expected: 8 rows — `id, user_id, exercise, week_start, weight_kg, reps, created_at, updated_at`, with `weight_kg` nullable (`YES`) and `reps` not nullable (`NO`). Also confirm RLS:
```sql
SELECT relrowsecurity FROM pg_class WHERE relname = 'weekly_lifts';
```
Expected: `t` (true). Do NOT commit.

---

## Task 2: Pure utilities `lift-metrics.ts` (TDD)

**Files:**
- Create: `src/lib/utils/lift-metrics.ts`
- Test: `src/lib/utils/__tests__/lift-metrics.test.ts`

**Interfaces:**
- Produces:
  - `LIFT_KEYS: readonly ['bench','squat','deadlift','overhead_press','pull_ups']`
  - `type LiftKey = (typeof LIFT_KEYS)[number]`
  - `interface LiftDef { key: LiftKey; display: string; bodyweight: boolean }`
  - `LIFTS: LiftDef[]` (ordered)
  - `interface LiftEntry { exercise: LiftKey; week_start: string; weight_kg: number | null; reps: number }`
  - `addDays(iso: string, n: number): string`
  - `weekStart(date: string): string`
  - `isoWeekNumber(date: string): number`
  - `interface LiftRow { def: LiftDef; current: { weight: number | null; reps: number } | null; previous: { week_start: string; weight: number | null; reps: number } | null; trend: { delta: number; dir: 'up' | 'down' | 'flat' } | null; weightChanged: boolean; history: { week_start: string; reps: number; weight: number | null }[] }`
  - `buildLiftRows(entries: LiftEntry[], today: string, weeks?: number): LiftRow[]`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/utils/__tests__/lift-metrics.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  weekStart,
  isoWeekNumber,
  addDays,
  buildLiftRows,
  LIFTS,
  LIFT_KEYS,
  type LiftEntry,
} from '../lift-metrics'

describe('weekStart (Monday-anchored, UTC)', () => {
  it('returns the same date for a Monday', () => {
    expect(weekStart('2026-06-22')).toBe('2026-06-22')
  })
  it('maps a mid-week day back to Monday', () => {
    expect(weekStart('2026-06-27')).toBe('2026-06-22') // Saturday
  })
  it('maps Sunday back to the same week Monday', () => {
    expect(weekStart('2026-06-28')).toBe('2026-06-22')
  })
  it('crosses a month boundary', () => {
    expect(weekStart('2026-07-01')).toBe('2026-06-29') // Wed -> Mon
  })
})

describe('addDays', () => {
  it('adds and subtracts UTC days across months', () => {
    expect(addDays('2026-06-22', 6)).toBe('2026-06-28')
    expect(addDays('2026-06-22', -7)).toBe('2026-06-15')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('isoWeekNumber (ISO-8601)', () => {
  it('Jan 1 2026 (Thursday) is week 1', () => {
    expect(isoWeekNumber('2026-01-01')).toBe(1)
  })
  it('2026-06-27 is week 26', () => {
    expect(isoWeekNumber('2026-06-27')).toBe(26)
  })
  it('Monday 2025-12-29 belongs to ISO week 1', () => {
    expect(isoWeekNumber('2025-12-29')).toBe(1)
  })
  it('2027-01-01 (Friday) belongs to week 53 of the prior year', () => {
    expect(isoWeekNumber('2027-01-01')).toBe(53)
  })
})

describe('LIFTS / LIFT_KEYS', () => {
  it('has the five lifts in order', () => {
    expect(LIFT_KEYS).toEqual([
      'bench', 'squat', 'deadlift', 'overhead_press', 'pull_ups',
    ])
    expect(LIFTS.map((l) => l.key)).toEqual([...LIFT_KEYS])
  })
  it('marks only pull_ups as bodyweight', () => {
    expect(LIFTS.find((l) => l.key === 'pull_ups')?.bodyweight).toBe(true)
    expect(LIFTS.find((l) => l.key === 'bench')?.bodyweight).toBe(false)
  })
})

const TODAY = '2026-06-27' // week of Mon 2026-06-22
const THIS = '2026-06-22'
const LAST = '2026-06-15'
const TWO_AGO = '2026-06-08'

function entry(
  exercise: LiftEntry['exercise'],
  week_start: string,
  weight_kg: number | null,
  reps: number,
): LiftEntry {
  return { exercise, week_start, weight_kg, reps }
}

describe('buildLiftRows', () => {
  it('returns a row per lift with no data when empty', () => {
    const rows = buildLiftRows([], TODAY)
    expect(rows).toHaveLength(5)
    for (const r of rows) {
      expect(r.current).toBeNull()
      expect(r.previous).toBeNull()
      expect(r.trend).toBeNull()
      expect(r.weightChanged).toBe(false)
      expect(r.history).toEqual([])
    }
  })

  it('computes an upward rep trend vs the previous logged week', () => {
    const rows = buildLiftRows(
      [entry('bench', LAST, 80, 8), entry('bench', THIS, 80, 9)],
      TODAY,
    )
    const bench = rows.find((r) => r.def.key === 'bench')!
    expect(bench.current).toEqual({ weight: 80, reps: 9 })
    expect(bench.previous).toEqual({ week_start: LAST, weight: 80, reps: 8 })
    expect(bench.trend).toEqual({ delta: 1, dir: 'up' })
    expect(bench.weightChanged).toBe(false)
    expect(bench.history.map((h) => h.reps)).toEqual([8, 9])
  })

  it('reports a flat trend at equal reps and a down trend at fewer', () => {
    const flat = buildLiftRows(
      [entry('squat', LAST, 100, 5), entry('squat', THIS, 100, 5)],
      TODAY,
    ).find((r) => r.def.key === 'squat')!
    expect(flat.trend).toEqual({ delta: 0, dir: 'flat' })

    const down = buildLiftRows(
      [entry('deadlift', LAST, 120, 6), entry('deadlift', THIS, 120, 5)],
      TODAY,
    ).find((r) => r.def.key === 'deadlift')!
    expect(down.trend).toEqual({ delta: -1, dir: 'down' })
  })

  it('skips a gap week when finding the previous logged week', () => {
    const bench = buildLiftRows(
      [entry('bench', TWO_AGO, 80, 7), entry('bench', THIS, 80, 9)],
      TODAY,
    ).find((r) => r.def.key === 'bench')!
    expect(bench.previous?.week_start).toBe(TWO_AGO)
    expect(bench.trend).toEqual({ delta: 2, dir: 'up' })
  })

  it('flags weightChanged when the load moved', () => {
    const bench = buildLiftRows(
      [entry('bench', LAST, 80, 8), entry('bench', THIS, 82.5, 6)],
      TODAY,
    ).find((r) => r.def.key === 'bench')!
    expect(bench.weightChanged).toBe(true)
    expect(bench.trend).toEqual({ delta: -2, dir: 'down' })
  })

  it('handles bodyweight pull-ups (null weight) without a weight change', () => {
    const pull = buildLiftRows(
      [entry('pull_ups', LAST, null, 10), entry('pull_ups', THIS, null, 12)],
      TODAY,
    ).find((r) => r.def.key === 'pull_ups')!
    expect(pull.current).toEqual({ weight: null, reps: 12 })
    expect(pull.weightChanged).toBe(false)
    expect(pull.trend).toEqual({ delta: 2, dir: 'up' })
  })

  it('exposes previous for prefill even when this week is unlogged', () => {
    const bench = buildLiftRows([entry('bench', LAST, 80, 8)], TODAY).find(
      (r) => r.def.key === 'bench',
    )!
    expect(bench.current).toBeNull()
    expect(bench.previous).toEqual({ week_start: LAST, weight: 80, reps: 8 })
    expect(bench.trend).toBeNull()
  })

  it('limits history to the requested window and orders oldest→newest', () => {
    const entries: LiftEntry[] = []
    for (let i = 0; i < 12; i++) {
      entries.push(entry('bench', addDays(THIS, -7 * i), 80, 10 - i))
    }
    const bench = buildLiftRows(entries, TODAY, 8).find(
      (r) => r.def.key === 'bench',
    )!
    expect(bench.history).toHaveLength(8)
    const weeks = bench.history.map((h) => h.week_start)
    expect(weeks[0] < weeks[weeks.length - 1]).toBe(true)
    expect(weeks[weeks.length - 1]).toBe(THIS)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/utils/__tests__/lift-metrics.test.ts`
Expected: FAIL — cannot resolve `../lift-metrics`.

- [ ] **Step 3: Implement `lift-metrics.ts`**

Create `src/lib/utils/lift-metrics.ts`:

```ts
// Pure, SSR-stable helpers for the weekly lift logger. `today` is always passed in,
// never read from the clock. Weeks are Monday-anchored, UTC, ISO weekday Mon=1..Sun=7.

export const LIFT_KEYS = [
  'bench',
  'squat',
  'deadlift',
  'overhead_press',
  'pull_ups',
] as const
export type LiftKey = (typeof LIFT_KEYS)[number]

export interface LiftDef {
  key: LiftKey
  display: string
  bodyweight: boolean
}

export const LIFTS: LiftDef[] = [
  { key: 'bench', display: 'BENCH PRESS', bodyweight: false },
  { key: 'squat', display: 'SQUAT', bodyweight: false },
  { key: 'deadlift', display: 'DEADLIFT', bodyweight: false },
  { key: 'overhead_press', display: 'OVERHEAD PRESS', bodyweight: false },
  { key: 'pull_ups', display: 'PULL-UPS', bodyweight: true },
]

export interface LiftEntry {
  exercise: LiftKey
  week_start: string
  weight_kg: number | null
  reps: number
}

export interface LiftRow {
  def: LiftDef
  current: { weight: number | null; reps: number } | null
  previous: { week_start: string; weight: number | null; reps: number } | null
  trend: { delta: number; dir: 'up' | 'down' | 'flat' } | null
  weightChanged: boolean
  history: { week_start: string; reps: number; weight: number | null }[]
}

function parseUTC(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, n: number): string {
  const d = parseUTC(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}

// Monday (UTC) of the week containing `date`.
export function weekStart(date: string): string {
  const d = parseUTC(date)
  const mondayIdx = (d.getUTCDay() + 6) % 7 // 0=Mon..6=Sun
  return addDays(date, -mondayIdx)
}

// ISO-8601 week number (1..53).
export function isoWeekNumber(date: string): number {
  const d = parseUTC(date)
  const dayNum = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // Thursday of this ISO week
  const thursday = d.getTime()
  d.setUTCMonth(0, 1) // Jan 1 of the Thursday's year
  if (d.getUTCDay() !== 4) {
    d.setUTCMonth(0, 1 + ((4 - d.getUTCDay() + 7) % 7)) // first Thursday of year
  }
  return 1 + Math.round((thursday - d.getTime()) / 604800000)
}

export function buildLiftRows(
  entries: LiftEntry[],
  today: string,
  weeks = 8,
): LiftRow[] {
  const thisWeek = weekStart(today)
  const windowStart = addDays(thisWeek, -7 * (weeks - 1))

  return LIFTS.map((def) => {
    const mine = entries
      .filter((e) => e.exercise === def.key)
      .filter((e) => e.week_start >= windowStart && e.week_start <= thisWeek)
      .sort((a, b) => a.week_start.localeCompare(b.week_start)) // oldest→newest

    const history = mine.map((e) => ({
      week_start: e.week_start,
      reps: e.reps,
      weight: e.weight_kg,
    }))

    const currentEntry = mine.find((e) => e.week_start === thisWeek) ?? null
    const current = currentEntry
      ? { weight: currentEntry.weight_kg, reps: currentEntry.reps }
      : null

    const previousEntry =
      [...mine].reverse().find((e) => e.week_start < thisWeek) ?? null
    const previous = previousEntry
      ? {
          week_start: previousEntry.week_start,
          weight: previousEntry.weight_kg,
          reps: previousEntry.reps,
        }
      : null

    let trend: LiftRow['trend'] = null
    let weightChanged = false
    if (current && previous) {
      const delta = current.reps - previous.reps
      trend = { delta, dir: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' }
      weightChanged = (current.weight ?? null) !== (previous.weight ?? null)
    }

    return { def, current, previous, trend, weightChanged, history }
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/utils/__tests__/lift-metrics.test.ts`
Expected: PASS (all cases). Do NOT commit.

---

## Task 3: Types + Zod schema

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/schemas/weekly-lifts.ts`

**Interfaces:**
- Consumes: `LiftKey`, `LIFT_KEYS` from `lift-metrics.ts`.
- Produces:
  - `WeeklyLift` interface in `@/types`
  - `UpsertWeeklyLiftSchema`, `UpsertWeeklyLiftInput`, `DeleteWeeklyLiftSchema`, `DeleteWeeklyLiftInput`

- [ ] **Step 1: Add the `WeeklyLift` type**

In `src/types/index.ts`, add near the other workout types (e.g., after `PersonalRecord`). Add the import at the top of the file with the other imports (or as the first `import type` line if none exist):

```ts
import type { LiftKey } from '@/lib/utils/lift-metrics'

export interface WeeklyLift {
  id: string
  user_id: string
  exercise: LiftKey
  week_start: string
  weight_kg: number | null
  reps: number
  created_at: string
  updated_at: string
}
```

(If `src/types/index.ts` has no existing imports, place the `import type` line at the very top; `lift-metrics.ts` does not import from `@/types`, so there is no runtime cycle.)

- [ ] **Step 2: Create the schema**

Create `src/lib/schemas/weekly-lifts.ts`:

```ts
import { z } from 'zod'
import { LIFT_KEYS } from '@/lib/utils/lift-metrics'

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
const optionalNumber = z
  .union([z.number().nonnegative(), z.null()])
  .optional()
  .nullable()

export const LiftKeySchema = z.enum(LIFT_KEYS)

export const UpsertWeeklyLiftSchema = z.object({
  exercise: LiftKeySchema,
  week_start: dateString,
  weight_kg: optionalNumber,
  reps: z.number().int().nonnegative(),
})
export type UpsertWeeklyLiftInput = z.infer<typeof UpsertWeeklyLiftSchema>

export const DeleteWeeklyLiftSchema = z.object({ id: z.string().uuid() })
export type DeleteWeeklyLiftInput = z.infer<typeof DeleteWeeklyLiftSchema>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors). Do NOT commit.

---

## Task 4: Server action `weekly-lifts.ts`

**Files:**
- Create: `src/lib/actions/weekly-lifts.ts`

**Interfaces:**
- Consumes: schemas from Task 3; `createClient` from `@/lib/supabase/action`; `requireUserId` from `@/lib/auth/server-user`.
- Produces: `upsertWeeklyLift(input: UpsertWeeklyLiftInput)`, `deleteWeeklyLift(input: DeleteWeeklyLiftInput)`.

- [ ] **Step 1: Create the action (mirrors `body-metrics.ts`)**

Create `src/lib/actions/weekly-lifts.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import {
  DeleteWeeklyLiftSchema,
  UpsertWeeklyLiftSchema,
  type DeleteWeeklyLiftInput,
  type UpsertWeeklyLiftInput,
} from '@/lib/schemas/weekly-lifts';

async function authedClient() {
  const userId = await requireUserId();
  const supabase = await createClient();
  return { supabase, userId };
}

function failed(name: string, error: { message: string; details?: string | null }) {
  console.error(`[${name}] supabase error:`, error);
  throw new Error(
    `${name} failed: ${error.message}${error.details ? ` (${error.details})` : ''}`,
  );
}

export async function upsertWeeklyLift(input: UpsertWeeklyLiftInput) {
  const parsed = UpsertWeeklyLiftSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('weekly_lifts')
    .upsert(
      {
        user_id: userId,
        exercise: parsed.exercise,
        week_start: parsed.week_start,
        weight_kg: parsed.weight_kg ?? null,
        reps: parsed.reps,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,exercise,week_start' },
    )
    .select()
    .single();

  if (error) failed('upsertWeeklyLift', error);
  revalidatePath('/workout');
  return data;
}

export async function deleteWeeklyLift(input: DeleteWeeklyLiftInput) {
  const parsed = DeleteWeeklyLiftSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('weekly_lifts')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('deleteWeeklyLift', error);
  revalidatePath('/workout');
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Do NOT commit.

---

## Task 5: `RepSparkline` shared component

**Files:**
- Create: `src/components/workout/RepSparkline.tsx`

**Interfaces:**
- Produces: `RepSparkline({ history, weeks }: { history: { reps: number }[]; weeks?: number })` — left-padded bar strip, oldest→newest.

- [ ] **Step 1: Create the component**

Create `src/components/workout/RepSparkline.tsx`:

```tsx
// Compact rep history strip. `history` is oldest→newest, only logged weeks.
// Pads on the left with hollow cells so the strip is always `weeks` wide.
export function RepSparkline({
  history,
  weeks = 8,
}: {
  history: { reps: number }[]
  weeks?: number
}) {
  const reps = history.slice(-weeks).map((h) => h.reps)
  const padded: (number | null)[] = [
    ...Array(Math.max(0, weeks - reps.length)).fill(null),
    ...reps,
  ]
  const max = Math.max(1, ...reps)

  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden="true">
      {padded.map((v, i) => (
        <div
          key={i}
          className={`w-1.5 ${v == null ? 'bg-border/40' : 'bg-text-primary'}`}
          style={{ height: v == null ? '14%' : `${Math.max(14, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Do NOT commit.

---

## Task 6: `LiftLogSheet` client logging sheet

**Files:**
- Create: `src/components/workout/LiftLogSheet.tsx`

**Interfaces:**
- Consumes: `upsertWeeklyLift`, `UpsertWeeklyLiftSchema`/`UpsertWeeklyLiftInput`, `LiftKey`, shadcn `Sheet`/`Button`/`Input`/`Label`.
- Produces: `LiftLogSheet({ exercise, display, bodyweight, weekStart, current, previous, triggerLabel })`.

- [ ] **Step 1: Create the sheet (mirrors `BodyMetricsSheet`)**

Create `src/components/workout/LiftLogSheet.tsx`:

```tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UpsertWeeklyLiftSchema,
  type UpsertWeeklyLiftInput,
} from '@/lib/schemas/weekly-lifts';
import { upsertWeeklyLift } from '@/lib/actions/weekly-lifts';
import type { LiftKey } from '@/lib/utils/lift-metrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const repsField = z
  .union([z.number().int().nonnegative(), z.nan()])
  .refine((v) => !Number.isNaN(v), { message: 'Enter reps' });

const weightField = z
  .union([z.number().nonnegative(), z.nan()])
  .optional()
  .transform((v) => (v === undefined || Number.isNaN(v) ? undefined : v));

function makeSchema(bodyweight: boolean) {
  return z
    .object({ reps: repsField, weight_kg: weightField })
    .superRefine((val, ctx) => {
      if (!bodyweight && val.weight_kg === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weight_kg'],
          message: 'Enter weight',
        });
      }
    });
}

type FormValues = { reps?: number; weight_kg?: number };

interface Props {
  exercise: LiftKey;
  display: string;
  bodyweight: boolean;
  weekStart: string;
  current: { weight: number | null; reps: number } | null;
  previous: { weight: number | null; reps: number } | null;
  triggerLabel: string;
}

export function LiftLogSheet({
  exercise,
  display,
  bodyweight,
  weekStart,
  current,
  previous,
  triggerLabel,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const initial: FormValues = {
    reps: current?.reps ?? undefined,
    weight_kg: current?.weight ?? previous?.weight ?? undefined,
  };

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(bodyweight) as never),
    defaultValues: initial,
  });

  React.useEffect(() => {
    if (open) reset(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: UpsertWeeklyLiftInput = UpsertWeeklyLiftSchema.parse({
        exercise,
        week_start: weekStart,
        weight_kg: values.weight_kg ?? null,
        reps: values.reps as number,
      });
      await upsertWeeklyLift(payload);
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  const lastWeekText = previous
    ? `Last week: ${previous.weight != null ? `${previous.weight} kg` : 'BW'} × ${previous.reps} reps`
    : 'No previous entry yet.';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="sm">{triggerLabel}</Button>} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{display} · this week</SheetTitle>
          <SheetDescription>{lastWeekText}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lift-reps">Reps</Label>
            <Input
              id="lift-reps"
              type="number"
              inputMode="numeric"
              autoFocus
              {...register('reps', { valueAsNumber: true })}
            />
            {formState.errors.reps && (
              <p className="text-xs text-destructive">{formState.errors.reps.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lift-weight">
              {bodyweight ? 'Added weight (kg, optional)' : 'Weight (kg)'}
            </Label>
            <Input
              id="lift-weight"
              type="number"
              inputMode="decimal"
              step="0.5"
              {...register('weight_kg', { valueAsNumber: true })}
            />
            {formState.errors.weight_kg && (
              <p className="text-xs text-destructive">{formState.errors.weight_kg.message}</p>
            )}
          </div>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
            <SheetClose render={<Button type="button" variant="ghost" />}>Cancel</SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Do NOT commit.

---

## Task 7: `WeeklyLiftsHero` (stacked-row hero)

**Files:**
- Create: `src/components/workout/WeeklyLiftsHero.tsx`

**Interfaces:**
- Consumes: `LiftRow` from `lift-metrics.ts`, `RepSparkline`, `LiftLogSheet`.
- Produces: `WeeklyLiftsHero({ rows, weekNumber, weekRange, weekStart, loggedCount })`.

- [ ] **Step 1: Create the hero**

Create `src/components/workout/WeeklyLiftsHero.tsx`:

```tsx
import type { LiftRow } from '@/lib/utils/lift-metrics'
import { RepSparkline } from './RepSparkline'
import { LiftLogSheet } from './LiftLogSheet'

interface Props {
  rows: LiftRow[]
  weekNumber: number
  weekRange: string // e.g. "JUN 23 – JUN 29"
  weekStart: string // current Monday (YYYY-MM-DD)
  loggedCount: number
}

function weightContext(
  current: LiftRow['current'],
  previous: LiftRow['previous'],
  bodyweight: boolean,
): string {
  const w = current?.weight ?? previous?.weight ?? null
  if (bodyweight) return w != null ? `BW+${w}` : 'BW'
  return w != null ? `${w} KG` : '—'
}

export function WeeklyLiftsHero({
  rows,
  weekNumber,
  weekRange,
  weekStart,
  loggedCount,
}: Props) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6 md:p-8">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ THIS WEEK · W{weekNumber} ]
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {weekRange} · <span className="text-text-primary">{loggedCount}</span>/5 LOGGED
        </span>
      </div>

      <div>
        {rows.map((row) => (
          <div
            key={row.def.key}
            className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-0"
          >
            <div className="w-32 shrink-0">
              <p className="truncate font-mono text-[12px] uppercase tracking-[0.08em] text-text-primary">
                {row.def.display}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                {weightContext(row.current, row.previous, row.def.bodyweight)}
              </p>
            </div>

            <div className="hidden flex-1 justify-center sm:flex">
              <RepSparkline history={row.history} />
            </div>

            <div className="w-20 shrink-0 text-right">
              {row.current ? (
                <p className="font-doto text-4xl leading-none tracking-tight text-text-display">
                  {row.current.reps}
                </p>
              ) : (
                <p className="font-doto text-4xl leading-none tracking-tight text-text-disabled">
                  —
                </p>
              )}
              <Trend trend={row.trend} weightChanged={row.weightChanged} />
            </div>

            <div className="w-16 shrink-0 text-right">
              <LiftLogSheet
                exercise={row.def.key}
                display={row.def.display}
                bodyweight={row.def.bodyweight}
                weekStart={weekStart}
                current={row.current}
                previous={row.previous}
                triggerLabel={row.current ? 'edit' : 'log'}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Trend({
  trend,
  weightChanged,
}: {
  trend: LiftRow['trend']
  weightChanged: boolean
}) {
  if (!trend) {
    return (
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        —
      </p>
    )
  }
  const glyph = trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '='
  const color =
    trend.dir === 'up'
      ? 'text-success'
      : trend.dir === 'down'
        ? 'text-accent'
        : 'text-text-secondary'
  const sign = trend.delta > 0 ? '+' : ''
  return (
    <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.08em] ${color}`}>
      {glyph} {trend.dir === 'flat' ? '' : `${sign}${trend.delta}`}
      {weightChanged && <span className="ml-1 text-text-disabled">WT</span>}
    </p>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Do NOT commit.

---

## Task 8: `WeeklyCheckCard` (weight + photo reminder)

**Files:**
- Create: `src/components/workout/WeeklyCheckCard.tsx`

**Interfaces:**
- Consumes: `BodyMetricsSheet`, `ProgressPhotoUploadSheet`, `DeletePhotoButton`, `formatUTCDate`.
- Produces: `WeeklyCheckCard({ today, hasWeighInThisWeek, recentWeights, hasPhotoThisWeek, recentPhotos })`.

- [ ] **Step 1: Create the card**

Create `src/components/workout/WeeklyCheckCard.tsx`:

```tsx
import { formatUTCDate } from '@/lib/utils/workout-metrics'
import { BodyMetricsSheet } from './BodyMetricsSheet'
import { ProgressPhotoUploadSheet } from './ProgressPhotoUploadSheet'
import { DeletePhotoButton } from './DeletePhotoButton'

interface RecentWeight {
  date: string
  weight: number | null
}
interface RecentPhoto {
  id: string
  signed_url: string | null
  date: string
}

interface Props {
  today: string
  hasWeighInThisWeek: boolean
  recentWeights: RecentWeight[] // newest-first
  hasPhotoThisWeek: boolean
  recentPhotos: RecentPhoto[] // newest-first
}

function fmt(iso: string): string {
  return formatUTCDate(iso, { day: '2-digit', month: 'short' }).toUpperCase()
}

export function WeeklyCheckCard({
  today,
  hasWeighInThisWeek,
  recentWeights,
  hasPhotoThisWeek,
  recentPhotos,
}: Props) {
  const latestWeight = recentWeights.find((w) => w.weight != null) ?? null
  const latestPhoto = recentPhotos[0] ?? null
  const remaining = (hasWeighInThisWeek ? 0 : 1) + (hasPhotoThisWeek ? 0 : 1)

  return (
    <section className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ WEEKLY CHECK ]
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {remaining === 0 ? (
            <span className="text-text-primary">ALL DONE</span>
          ) : (
            <>
              <span className="text-text-primary">{remaining}</span> LEFT
            </>
          )}
        </span>
      </div>

      <Row
        done={hasWeighInThisWeek}
        label="WEIGH-IN"
        detail={
          hasWeighInThisWeek && latestWeight?.weight != null
            ? `${latestWeight.weight} KG · ${fmt(latestWeight.date)}`
            : 'PENDING THIS WEEK'
        }
        action={
          <BodyMetricsSheet
            triggerLabel={hasWeighInThisWeek ? 'Edit' : 'Log'}
            triggerVariant="ghost"
            defaults={{ date: today }}
            title="Log body metrics"
          />
        }
      />
      <Row
        done={hasPhotoThisWeek}
        label="PHOTO"
        detail={
          hasPhotoThisWeek && latestPhoto
            ? `ADDED · ${fmt(latestPhoto.date)}`
            : 'PENDING THIS WEEK'
        }
        action={<ProgressPhotoUploadSheet triggerLabel="Add" />}
        last
      />

      {recentWeights.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            RECENT WEIGHTS
          </p>
          <div className="divide-y divide-border">
            {recentWeights.slice(0, 4).map((w) => (
              <div key={w.date} className="flex items-center justify-between py-1.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                  {fmt(w.date)}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-text-primary">
                  {w.weight != null ? `${w.weight.toFixed(1)} KG` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentPhotos.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            LATEST PHOTOS
          </p>
          <div className="flex gap-2">
            {recentPhotos.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="group relative aspect-[3/4] w-1/4 overflow-hidden rounded border border-border bg-surface-raised"
              >
                {p.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.signed_url}
                    alt={fmt(p.date)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-[8px] uppercase text-text-disabled">
                    NO PREVIEW
                  </div>
                )}
                <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <DeletePhotoButton id={p.id} label={fmt(p.date)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Row({
  done,
  label,
  detail,
  action,
  last,
}: {
  done: boolean
  label: string
  detail: string
  action: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 ${last ? '' : 'border-b border-border'}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`font-mono text-[13px] ${done ? 'text-text-primary' : 'text-text-disabled'}`}
        >
          {done ? '[✓]' : '[ ]'}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-primary">
            {label}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            {detail}
          </p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Do NOT commit.

---

## Task 9: `ProgressionCard` (8-week history)

**Files:**
- Create: `src/components/workout/ProgressionCard.tsx`

**Interfaces:**
- Consumes: `LiftRow` from `lift-metrics.ts`, `RepSparkline`.
- Produces: `ProgressionCard({ rows, weeks })`.

- [ ] **Step 1: Create the card**

Create `src/components/workout/ProgressionCard.tsx`:

```tsx
import type { LiftRow } from '@/lib/utils/lift-metrics'
import { RepSparkline } from './RepSparkline'

interface Props {
  rows: LiftRow[]
  weeks: number
}

export function ProgressionCard({ rows, weeks }: Props) {
  return (
    <section className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ PROGRESSION · {weeks} WK ]
        </span>
      </div>

      <div className="divide-y divide-border">
        {rows.map((row) => {
          const logged = row.history
          const latest = logged.length ? logged[logged.length - 1].reps : null
          const gain =
            logged.length >= 2 ? logged[logged.length - 1].reps - logged[0].reps : null
          return (
            <div
              key={row.def.key}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="w-28 shrink-0 truncate font-mono text-[11px] uppercase tracking-[0.08em] text-text-primary">
                {row.def.display}
              </span>
              <div className="flex flex-1 justify-center">
                <RepSparkline history={row.history} weeks={weeks} />
              </div>
              <div className="w-20 shrink-0 text-right">
                <p className="font-mono text-[13px] tabular-nums text-text-primary">
                  {latest != null ? latest : '—'}
                  <span className="text-text-disabled"> reps</span>
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                  {gain != null
                    ? `${gain > 0 ? '+' : ''}${gain} OVER ${logged.length} WK`
                    : 'NO DATA'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Do NOT commit.

---

## Task 10: Rewrite the workout page + delete orphans

**Files:**
- Modify: `src/app/(app)/workout/page.tsx` (full rewrite)
- Delete: the 9 orphaned components listed in **File Structure**

**Interfaces:**
- Consumes: `WeeklyLiftsHero`, `WeeklyCheckCard`, `ProgressionCard`, `buildLiftRows`, `weekStart`, `isoWeekNumber`, `addDays`, `formatUTCDate`, `WeeklyLift`/`BodyMetrics`/`ProgressPhoto` types.

- [ ] **Step 1: Read the Next.js guide referenced by AGENTS.md**

Per `AGENTS.md`, before editing the page read the relevant data-fetching / server-component guide:

Run: `ls node_modules/next/dist/docs/` then read the file matching app-router data fetching / server components.
Expected: confirm the server-component data-fetch + `createClient` pattern is unchanged from what `page.tsx` already uses (parallel `Promise.all`, `await createClient()`).

- [ ] **Step 2: Rewrite `src/app/(app)/workout/page.tsx`**

Replace the entire file with:

```tsx
import { createClient } from '@/lib/supabase/server'
import { requireUserId } from '@/lib/auth/server-user'
import { WeeklyLiftsHero } from '@/components/workout/WeeklyLiftsHero'
import { WeeklyCheckCard } from '@/components/workout/WeeklyCheckCard'
import { ProgressionCard } from '@/components/workout/ProgressionCard'
import { formatUTCDate } from '@/lib/utils/workout-metrics'
import {
  weekStart,
  isoWeekNumber,
  addDays,
  buildLiftRows,
  type LiftEntry,
} from '@/lib/utils/lift-metrics'
import type { BodyMetrics, ProgressPhoto, WeeklyLift } from '@/types'

const PROGRESS_PHOTO_BUCKET = 'progress-photos'
const HISTORY_WEEKS = 8

export default async function WorkoutPage() {
  const userId = await requireUserId()
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const thisMonday = weekStart(today)
  const liftWindowStart = addDays(thisMonday, -7 * (HISTORY_WEEKS - 1))
  const weightWindowStart = addDays(thisMonday, -7 * 5) // ~5 weeks of weigh-ins

  const [weeklyLiftsResult, bodyMetricsResult, progressPhotosResult] =
    await Promise.all([
      supabase
        .from('weekly_lifts')
        .select('id, user_id, exercise, week_start, weight_kg, reps, created_at, updated_at')
        .eq('user_id', userId)
        .gte('week_start', liftWindowStart)
        .order('week_start', { ascending: false }),
      supabase
        .from('body_metrics')
        .select('id, user_id, date, weight_kg, waist_cm, arm_cm, leg_cm, forearm_cm, calf_cm, notes, created_at')
        .eq('user_id', userId)
        .gte('date', weightWindowStart)
        .order('date', { ascending: false }),
      supabase
        .from('progress_photos')
        .select('id, user_id, date, pose, storage_path, thumbnail_path, created_at')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(4),
    ])

  const weeklyLifts = (weeklyLiftsResult.data ?? []) as WeeklyLift[]
  const bodyMetrics = (bodyMetricsResult.data ?? []) as BodyMetrics[]
  const photos = (progressPhotosResult.data ?? []) as ProgressPhoto[]

  const liftEntries: LiftEntry[] = weeklyLifts.map((l) => ({
    exercise: l.exercise,
    week_start: l.week_start,
    weight_kg: l.weight_kg != null ? Number(l.weight_kg) : null,
    reps: l.reps,
  }))
  const rows = buildLiftRows(liftEntries, today, HISTORY_WEEKS)
  const loggedCount = rows.filter((r) => r.current != null).length
  const weekNumber = isoWeekNumber(today)

  const sunday = addDays(thisMonday, 6)
  const weekRange = `${formatUTCDate(thisMonday, { day: 'numeric', month: 'short' })} – ${formatUTCDate(sunday, { day: 'numeric', month: 'short' })}`.toUpperCase()
  const fullWeekLabel = `WEEK ${weekNumber} · ${formatUTCDate(thisMonday, { weekday: 'short', day: 'numeric', month: 'short' })} – ${formatUTCDate(sunday, { weekday: 'short', day: 'numeric', month: 'short' })}`.toUpperCase()

  const hasWeighInThisWeek = bodyMetrics.some(
    (b) => b.date >= thisMonday && b.weight_kg != null,
  )
  const recentWeights = bodyMetrics.map((b) => ({
    date: b.date,
    weight: b.weight_kg != null ? Number(b.weight_kg) : null,
  }))
  const hasPhotoThisWeek = photos.some((p) => p.date >= thisMonday)

  const recentPhotos = await Promise.all(
    photos.map(async (p) => {
      const path = p.thumbnail_path ?? p.storage_path
      try {
        const { data } = await supabase.storage
          .from(PROGRESS_PHOTO_BUCKET)
          .createSignedUrl(path, 60 * 60)
        return { id: p.id, date: p.date, signed_url: data?.signedUrl ?? null }
      } catch {
        return { id: p.id, date: p.date, signed_url: null }
      }
    }),
  )

  return (
    <div className="w-full px-4 py-8 pb-24">
      <header className="mb-6">
        <h1 className="mb-3 font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">
          WORKOUT
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {fullWeekLabel}
        </p>
      </header>

      <WeeklyLiftsHero
        rows={rows}
        weekNumber={weekNumber}
        weekRange={weekRange}
        weekStart={thisMonday}
        loggedCount={loggedCount}
      />

      <div className="mt-4 gap-4 [column-fill:_balance] columns-1 md:columns-2">
        <WeeklyCheckCard
          today={today}
          hasWeighInThisWeek={hasWeighInThisWeek}
          recentWeights={recentWeights}
          hasPhotoThisWeek={hasPhotoThisWeek}
          recentPhotos={recentPhotos}
        />
        <ProgressionCard rows={rows} weeks={HISTORY_WEEKS} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify no other importers before deleting orphans**

Run:
```bash
git grep -nE "RecompInstrument|GirthRailsCard|MacrosCard|StrengthLog|WeighInLog|TodayLogStatus|NutritionSheet|DeleteNutritionLogButton|ProgressPhotosGrid" -- 'src/**' ':!src/components/workout/*'
```
Expected: **no output** (only the workout components reference each other). If any app/dashboard file still imports one, stop and report it rather than deleting.

- [ ] **Step 4: Delete the orphaned components**

Run:
```bash
rm src/components/workout/RecompInstrument.tsx \
   src/components/workout/GirthRailsCard.tsx \
   src/components/workout/MacrosCard.tsx \
   src/components/workout/StrengthLog.tsx \
   src/components/workout/WeighInLog.tsx \
   src/components/workout/TodayLogStatus.tsx \
   src/components/workout/NutritionSheet.tsx \
   src/components/workout/DeleteNutritionLogButton.tsx \
   src/components/workout/ProgressPhotosGrid.tsx
```

- [ ] **Step 5: Check for now-orphaned nutrition action/schema imports**

Run:
```bash
git grep -nE "upsertNutritionLog|deleteNutritionLog|UpsertNutritionLogSchema|nutrition-logs" -- 'src/**'
```
Expected: only `src/lib/actions/nutrition-logs.ts` and `src/lib/schemas/nutrition-logs.ts` reference themselves (no component importers remain). Leave those files in place (the `nutrition_logs` table is retained); do NOT delete them. If anything else imports them, report it.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no dangling imports). Do NOT commit.

---

## Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + lint + unit tests**

Run: `npm run typecheck && npm run lint && npm run test:unit`
Expected: all PASS. The `lift-metrics` suite passes; no type or lint errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds; `/workout` compiles as a server route with no missing-module or type errors.

- [ ] **Step 3: Manual smoke test (optional, requires dev server)**

Run: `npm run dev`, open `/workout`, and confirm:
- Header shows `WEEK <n> · MON … – SUN …`.
- Hero lists the five lifts; unlogged lifts show `—` and a `log` button.
- Logging a lift (reps + weight) saves, closes the sheet, and the row updates with the rep number + a green ▲ trend the following week; bumping the weight shows the `WT` flag.
- `WEEKLY CHECK` shows weigh-in/photo pending → ✓ after logging this week; recent weights and latest photos render.
- `PROGRESSION` shows per-lift sparklines and reps-gained.

Note: `npm run test:e2e` / `npm run verify` include Playwright, which needs the dev server + installed browsers; run only if that infra is set up. Do NOT commit any changes.

---

## Self-Review

**Spec coverage:**
- Five lifts, max-reps-at-set-weight model → Tasks 2 (`LIFTS`, `LiftEntry`), 3 (schema), 4 (action). ✓
- Weight pre-fills from last week, reps headline, trend flags weight change → Task 6 (`LiftLogSheet` prefill), Task 2 (`previous`/`weightChanged`), Task 7 (`Trend` + `WT`). ✓
- Monday-anchored week + ISO week label → Task 2 (`weekStart`/`isoWeekNumber`), Task 10 (header). ✓
- Stacked-row hero (Option A) → Task 7. ✓
- Weekly weight + photo reminder → Task 8. ✓
- 8-week progression history → Task 9. ✓
- New `weekly_lifts` table applied via MCP + migration file; `personal_records` retained → Task 1. ✓
- Strip-down: macros/girths/trajectory removed; `BodyMetricsSheet`/`ProgressPhotoUploadSheet` reused → Task 10. (Deviation from spec: `ProgressPhotosGrid` is also deleted and replaced by `WeeklyCheckCard`'s compact strip, which reuses `DeletePhotoButton`. Noted in File Structure.) ✓
- TDD on pure utils → Task 2. ✓
- Color/typography discipline → Global Constraints + Tasks 7–9. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full source; commands have expected output. ✓

**Type consistency:** `LiftKey`/`LIFT_KEYS`/`LIFTS`/`LiftEntry`/`LiftRow` defined in Task 2 and consumed unchanged in Tasks 3, 6, 7, 9, 10. `UpsertWeeklyLiftInput`/`UpsertWeeklyLiftSchema` defined in Task 3, used in Tasks 4 and 6. `WeeklyLift` defined in Task 3, used in Task 10. `buildLiftRows(entries, today, weeks)` signature consistent across Tasks 2 and 10. `RepSparkline({ history, weeks })` consistent across Tasks 5, 7, 9. ✓
