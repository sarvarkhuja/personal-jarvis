# Simplify Pills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the "pills" feature (DB entity `medication`) to a habit-style daily checkbox — a pill is just a name, checked off per day on a 7-day grid.

**Architecture:** Mirror the habits dashboard's per-day toggle: a `UNIQUE(user_id, medication_id, log_date)` on `medication_logs` plus an atomic `toggle_medication_completion` RPC (delete-or-insert one row per day). The `/pills` page renders a 7-day checkbox grid built by a new pure helper; the Today page shows a simplified "due today" toggle. All dosage/schedule/supply/refill code is removed.

**Tech Stack:** Next.js (App Router, server components + server actions), Supabase (Postgres + RLS), Zod, react-hook-form, Vitest, Tailwind (Nothing design tokens), date-fns-tz.

## Global Constraints

- A pill is **name only** — no dosage, schedule/times, supply, warn-days, refill, or notes.
- Per-day check-off is **one row per `(user_id, medication_id, log_date)`**, toggled via the `toggle_medication_completion` RPC. Never insert duplicate per-day rows.
- `log_date` is the user-local `YYYY-MM-DD` derived from `profiles.timezone` — never trust the client clock. Use `toUserDate(new Date(), tz)` for "today".
- Do **not** rename the `medications` / `medication_logs` tables or the `/pills` route.
- Pills are **not** linked to goals (unlike habits — do not add a `goal_id`).
- The 7-day grid shows the last 7 days ending today, **today rightmost**; any of the 7 days is toggleable.
- Keep the existing Nothing design tokens/classes (`text-text-primary`, `bg-text-display`, `border-border`, `font-mono`, etc.). Match the existing widget/list patterns.
- Every commit must keep `npm run typecheck`, `npm run lint`, and `npm run test:run` green. Tasks are ordered additive → swap → delete to guarantee this.
- Commands: typecheck `npm run typecheck`; lint `npm run lint`; unit tests `npm run test:run` (single file: `npx vitest run <path>`); build `npm run build`.

---

## File Structure

**New files**
- `supabase/migrations/016_simplify_medications.sql` — schema reduction + unique index + toggle RPC.
- `src/lib/domain/pill-grid.ts` — pure helpers: `buildPillWeek`, `medicationGridRows`.
- `src/lib/domain/__tests__/pill-grid.test.ts` — unit tests for the above.
- `src/lib/schemas/__tests__/medications.test.ts` — unit test for `ToggleMedicationSchema`.
- `src/components/pills/PillDayCell.tsx` — one grid cell (client) toggling a single `(med, date)`.
- `src/components/today/PillToggleButton.tsx` — Today widget's single "today" toggle (client).

**Modified files**
- `src/lib/schemas/medications.ts` — simplify to name + toggle.
- `src/lib/actions/medications.ts` — `createMedication({name})`, `toggleMedicationCompletion`; drop dose/refill/update.
- `src/app/(app)/pills/page.tsx` — 7-day grid page.
- `src/components/pills/MedicationRow.tsx` — client grid row (name + 7 cells + delete).
- `src/components/pills/AddMedicationSheet.tsx` — name-only form.
- `src/app/(app)/today/page.tsx` — simplified medication fetch + pending count.
- `src/components/today/PillsDueWidget.tsx` — one row per pill, single toggle.
- `src/lib/domain/index.ts` — drop the `medications` re-export.

**Deleted files**
- `src/components/pills/RefillButton.tsx`
- `src/components/today/LogDoseControls.tsx`
- `src/components/today/LowSupplyBanner.tsx`
- `src/lib/domain/medications.ts`

**Verified no-ops (do not touch):** `src/app/api/export/route.ts` (uses `select('*')`), `src/components/layout/AppSidebar.tsx`, `src/components/dashboard/JarvisDashboard.tsx`, `src/components/keyboard/ShortcutsProvider.tsx`, `src/components/pills/DeleteMedicationButton.tsx`, `src/components/today/DayStrip.tsx` (its `pendingPills: number` prop is unchanged).

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/016_simplify_medications.sql`

**Interfaces:**
- Produces: a Postgres function `toggle_medication_completion(p_user_id UUID, p_medication_id UUID, p_date DATE) RETURNS void`; `medications` reduced to `(id, user_id, name, archived_at, created_at)`; `medication_logs` reduced to `(id, user_id, medication_id, log_date, created_at)` with a unique index on `(user_id, medication_id, log_date)`.

**Context:** This is the only DB change. The live Supabase DB is known to contain objects absent from the migrations folder, so the migration must be idempotent (`IF EXISTS` / `IF NOT EXISTS`) and is **applied to the live DB via the Supabase MCP** in addition to being committed as a file. The atomic RPC is a copy of `toggle_habit_completion` in `supabase/migrations/003_jarvis_rpc_toggles.sql`.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/016_simplify_medications.sql`:

```sql
-- 016_simplify_medications.sql
-- Reduce "pills" (medications) to a habit-style daily checkbox: name + per-day toggle.
-- Drops dosage/schedule/supply/notes; collapses medication_logs to one row per day.

-- 1. medications: drop everything except name.
ALTER TABLE public.medications
  DROP COLUMN IF EXISTS dosage,
  DROP COLUMN IF EXISTS schedule_json,
  DROP COLUMN IF EXISTS supply_count,
  DROP COLUMN IF EXISTS supply_warn_days,
  DROP COLUMN IF EXISTS notes;

-- 2. medication_logs: collapse to one row per (user, medication, day).
--    Dedupe BEFORE adding the unique index (the table currently allows
--    multiple dose rows per day). Keep the earliest row per group.
DELETE FROM public.medication_logs
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY user_id, medication_id, log_date
      ORDER BY created_at, id
    ) AS rn
    FROM public.medication_logs
  ) ranked
  WHERE ranked.rn > 1
);

ALTER TABLE public.medication_logs
  DROP COLUMN IF EXISTS taken_at,
  DROP COLUMN IF EXISTS scheduled_time,
  DROP COLUMN IF EXISTS skipped,
  DROP COLUMN IF EXISTS note;

CREATE UNIQUE INDEX IF NOT EXISTS medication_logs_user_med_date_key
  ON public.medication_logs (user_id, medication_id, log_date);

-- 3. Atomic per-day toggle — mirror of toggle_habit_completion (003).
CREATE OR REPLACE FUNCTION toggle_medication_completion(
  p_user_id UUID, p_medication_id UUID, p_date DATE
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.medication_logs
  WHERE user_id = p_user_id AND medication_id = p_medication_id AND log_date = p_date;
  IF NOT FOUND THEN
    INSERT INTO public.medication_logs (user_id, medication_id, log_date)
    VALUES (p_user_id, p_medication_id, p_date);
  END IF;
END; $$;
```

- [ ] **Step 2: Check for dependent DB objects before applying**

Via the Supabase MCP, run this and confirm it returns no rows that would block the column drops (e.g. a trigger/view referencing `dosage`/`supply_count`). If it returns dependents, stop and report — do not blindly `CASCADE`.

```sql
SELECT dependent.relname AS dependent_object, pg_get_constraintdef(c.oid)
FROM pg_depend d
JOIN pg_class dependent ON dependent.oid = d.objid
LEFT JOIN pg_constraint c ON c.oid = d.objid
WHERE d.refobjid IN ('public.medications'::regclass, 'public.medication_logs'::regclass)
  AND d.deptype = 'n';
```

Expected: no application-defined dependents on the dropped columns (RLS policies and the user-id/medication-id FKs are on columns we keep).

- [ ] **Step 3: Apply the migration to the live DB via the Supabase MCP**

Execute the full SQL from Step 1 against the live database using the Supabase MCP (`apply_migration` / `execute_sql`). If the MCP requires authentication first, authenticate, then apply.

- [ ] **Step 4: Verify the live schema**

Via the Supabase MCP, confirm:

```sql
-- medications columns (expect: id, user_id, name, archived_at, created_at)
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='medications' ORDER BY ordinal_position;

-- medication_logs columns (expect: id, user_id, medication_id, log_date, created_at)
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='medication_logs' ORDER BY ordinal_position;

-- unique index exists
SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND tablename='medication_logs'
  AND indexname='medication_logs_user_med_date_key';

-- RPC exists
SELECT proname FROM pg_proc WHERE proname='toggle_medication_completion';
```

Expected: column lists match, the index row is present, and `toggle_medication_completion` is returned.

- [ ] **Step 5: Smoke-test the RPC via MCP (optional but recommended)**

If a medication row exists for your user, call the RPC twice with the same args and confirm it inserts then deletes (row count for that `(user, med, date)` goes 0 → 1 → 0). Clean up any test row.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/016_simplify_medications.sql
git commit -m "feat(pills): migration — reduce medications to per-day checkbox + toggle RPC"
```

---

### Task 2: Pure 7-day grid helpers

**Files:**
- Create: `src/lib/domain/pill-grid.ts`
- Test: `src/lib/domain/__tests__/pill-grid.test.ts`

**Interfaces:**
- Produces:
  - `type PillDay = { date: string; isoWeekday: number; label: string; isToday: boolean }`
  - `buildPillWeek(today: string, count?: number): PillDay[]` — `count` defaults to 7; returns days ending at `today` (today last), `label` is a 2-letter weekday.
  - `type GridCell = { date: string; checked: boolean }`
  - `type GridRow = { id: string; name: string; cells: GridCell[] }`
  - `medicationGridRows(meds: { id: string; name: string }[], logs: { medication_id: string; log_date: string }[], week: PillDay[]): GridRow[]`

**Context:** Pure functions, no I/O — the testable core. `today` is already a user-local `YYYY-MM-DD` string (the page derives it with `toUserDate`). Date math uses `Date.UTC(...,12)` (noon) to avoid DST edge cases; this matches the existing `nextCalendarDay` helper style in `src/lib/domain/timezone.ts`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/domain/__tests__/pill-grid.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildPillWeek, medicationGridRows } from '../pill-grid';

describe('buildPillWeek', () => {
  it('returns 7 days ending on today, today rightmost', () => {
    const week = buildPillWeek('2026-06-27');
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.date)).toEqual([
      '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24',
      '2026-06-25', '2026-06-26', '2026-06-27',
    ]);
    expect(week[6].isToday).toBe(true);
    expect(week.slice(0, 6).every((d) => !d.isToday)).toBe(true);
  });

  it('labels ISO weekdays Monday-first', () => {
    // 2026-06-27 is a Saturday; 2026-06-21 is a Sunday.
    const week = buildPillWeek('2026-06-27');
    expect(week[6].isoWeekday).toBe(6);
    expect(week[6].label).toBe('Sa');
    expect(week[0].isoWeekday).toBe(7);
    expect(week[0].label).toBe('Su');
  });

  it('crosses month boundaries correctly', () => {
    const week = buildPillWeek('2026-07-01');
    expect(week.map((d) => d.date)).toEqual([
      '2026-06-25', '2026-06-26', '2026-06-27', '2026-06-28',
      '2026-06-29', '2026-06-30', '2026-07-01',
    ]);
  });
});

describe('medicationGridRows', () => {
  const week = buildPillWeek('2026-06-27');

  it('marks a cell checked when a log exists for that med+date', () => {
    const rows = medicationGridRows(
      [{ id: 'm1', name: 'Vitamin D' }],
      [{ medication_id: 'm1', log_date: '2026-06-27' }],
      week,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cells.find((c) => c.date === '2026-06-27')?.checked).toBe(true);
    expect(rows[0].cells.filter((c) => c.checked)).toHaveLength(1);
  });

  it('leaves cells unchecked with no logs and keeps meds independent', () => {
    const rows = medicationGridRows(
      [{ id: 'm1', name: 'A' }, { id: 'm2', name: 'B' }],
      [{ medication_id: 'm1', log_date: '2026-06-26' }],
      week,
    );
    expect(rows[0].cells.find((c) => c.date === '2026-06-26')?.checked).toBe(true);
    expect(rows[1].cells.every((c) => !c.checked)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/domain/__tests__/pill-grid.test.ts`
Expected: FAIL — cannot resolve `../pill-grid` / functions not defined.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/domain/pill-grid.ts`:

```ts
// Pure helpers for the /pills 7-day checkbox grid. No I/O.

export type PillDay = {
  date: string; // YYYY-MM-DD
  isoWeekday: number; // 1=Mon .. 7=Sun
  label: string; // 2-letter weekday, e.g. "Mo"
  isToday: boolean;
};

export type GridCell = { date: string; checked: boolean };
export type GridRow = { id: string; name: string; cells: GridCell[] };

// Index by ISO weekday 1..7 (index 0 unused).
const WEEKDAY_LABELS = ['', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Shift a YYYY-MM-DD by whole days using noon-UTC math (DST-safe). */
function shiftDate(date: string, deltaDays: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d + deltaDays, 12);
  const nd = new Date(t);
  const yyyy = nd.getUTCFullYear();
  const mm = String(nd.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(nd.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** ISO weekday (1=Mon..7=Sun) for a YYYY-MM-DD string. */
function isoWeekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return dow === 0 ? 7 : dow;
}

/** The last `count` days ending at `today` (today last/rightmost). */
export function buildPillWeek(today: string, count = 7): PillDay[] {
  const days: PillDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = shiftDate(today, -i);
    const isoWeekday = isoWeekdayOf(date);
    days.push({
      date,
      isoWeekday,
      label: WEEKDAY_LABELS[isoWeekday],
      isToday: i === 0,
    });
  }
  return days;
}

/** One row per medication, each with a checked/unchecked cell per week day. */
export function medicationGridRows(
  meds: { id: string; name: string }[],
  logs: { medication_id: string; log_date: string }[],
  week: PillDay[],
): GridRow[] {
  const logged = new Set(logs.map((l) => `${l.medication_id}|${l.log_date}`));
  return meds.map((m) => ({
    id: m.id,
    name: m.name,
    cells: week.map((d) => ({
      date: d.date,
      checked: logged.has(`${m.id}|${d.date}`),
    })),
  }));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/domain/__tests__/pill-grid.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/pill-grid.ts src/lib/domain/__tests__/pill-grid.test.ts
git commit -m "feat(pills): pure 7-day grid helpers (buildPillWeek, medicationGridRows)"
```

---

### Task 3: Schemas + server actions (additive swap)

**Files:**
- Modify: `src/lib/schemas/medications.ts`
- Modify: `src/lib/actions/medications.ts`
- Test: `src/lib/schemas/__tests__/medications.test.ts`

**Interfaces:**
- Produces:
  - `CreateMedicationSchema = z.object({ name })`, `type CreateMedicationInput = { name: string }`.
  - `ToggleMedicationSchema = z.object({ medication_id: uuid, date: /^\d{4}-\d{2}-\d{2}$/ })`, `type ToggleMedicationInput`.
  - `createMedication(input: CreateMedicationInput)` — inserts `{ user_id, name }` only.
  - `toggleMedicationCompletion(input: ToggleMedicationInput)` — calls the RPC; revalidates `/pills` + `/today`.
- Keeps (this task only; removed in Task 6): `logDose`, `skipDose`, `refill`, `writeDoseLog`, and `LogDoseSchema`/`SkipDoseSchema`/`RefillSchema`/`MedicationScheduleSchema` — so `LogDoseControls.tsx` and `RefillButton.tsx` still compile.
- Removes now: `updateMedication` + `UpdateMedicationSchema` (no external consumers — verified).

**Context:** `CreateMedicationSchema` is simplified to `{ name }`. `.parse()` strips unknown keys, so the *current* `AddMedicationSheet` (which still passes dosage/schedule/etc.) keeps compiling and working until it's rewritten in Task 4. The action client/error helpers (`authedClient`, `failed`) and the RPC call pattern mirror `src/actions/discipline.ts:toggleHabitCompletion`.

- [ ] **Step 1: Write the failing schema test**

Create `src/lib/schemas/__tests__/medications.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ToggleMedicationSchema, CreateMedicationSchema } from '../medications';

describe('ToggleMedicationSchema', () => {
  it('accepts a uuid medication_id and YYYY-MM-DD date', () => {
    const r = ToggleMedicationSchema.parse({
      medication_id: '11111111-1111-1111-1111-111111111111',
      date: '2026-06-27',
    });
    expect(r.date).toBe('2026-06-27');
  });

  it('rejects a malformed date', () => {
    expect(() =>
      ToggleMedicationSchema.parse({
        medication_id: '11111111-1111-1111-1111-111111111111',
        date: '6/27/2026',
      }),
    ).toThrow();
  });

  it('rejects a non-uuid medication_id', () => {
    expect(() =>
      ToggleMedicationSchema.parse({ medication_id: 'nope', date: '2026-06-27' }),
    ).toThrow();
  });
});

describe('CreateMedicationSchema', () => {
  it('requires only a name and strips extra keys', () => {
    const r = CreateMedicationSchema.parse({ name: 'Vitamin D', dosage: '1000IU' } as never);
    expect(r).toEqual({ name: 'Vitamin D' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/schemas/__tests__/medications.test.ts`
Expected: FAIL — `ToggleMedicationSchema` is not exported yet.

- [ ] **Step 3: Rewrite the schema file**

Replace the entire contents of `src/lib/schemas/medications.ts` with:

```ts
import { z } from 'zod';

const TimeOfDay = z
  .string()
  .regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'expected HH:MM');

// Retained until Task 6 — still consumed by logDose/skipDose/refill.
export const MedicationScheduleSchema = z.object({
  times: z.array(TimeOfDay).min(1).max(8),
  days: z.union([
    z.literal('daily'),
    z.array(z.number().int().min(1).max(7)).min(1).max(7),
  ]),
});
export type MedicationScheduleInput = z.infer<typeof MedicationScheduleSchema>;

export const CreateMedicationSchema = z.object({
  name: z.string().min(1).max(80),
});
export type CreateMedicationInput = z.infer<typeof CreateMedicationSchema>;

export const ArchiveMedicationSchema = z.object({
  id: z.string().uuid(),
  archive: z.boolean().default(true),
});
export type ArchiveMedicationInput = z.infer<typeof ArchiveMedicationSchema>;

export const DeleteMedicationSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteMedicationInput = z.infer<typeof DeleteMedicationSchema>;

export const ToggleMedicationSchema = z.object({
  medication_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
});
export type ToggleMedicationInput = z.infer<typeof ToggleMedicationSchema>;

// Retained until Task 6 (consumed by logDose/skipDose/refill).
export const LogDoseSchema = z.object({
  medication_id: z.string().uuid(),
  scheduled_time: TimeOfDay.optional(),
  taken_at: z.string().datetime().optional(),
  note: z.string().max(280).optional(),
});
export type LogDoseInput = z.infer<typeof LogDoseSchema>;

export const SkipDoseSchema = z.object({
  medication_id: z.string().uuid(),
  scheduled_time: TimeOfDay,
  note: z.string().max(280).optional(),
});
export type SkipDoseInput = z.infer<typeof SkipDoseSchema>;

export const RefillSchema = z.object({
  id: z.string().uuid(),
  supply_count: z.number().nonnegative(),
});
export type RefillInput = z.infer<typeof RefillSchema>;
```

(This removes `UpdateMedicationSchema`/`UpdateMedicationInput`.)

- [ ] **Step 4: Update the actions file**

In `src/lib/actions/medications.ts`:

(a) Replace the schema import block (lines 7–22) with — note `UpdateMedicationSchema`/`UpdateMedicationInput` removed, `ToggleMedicationSchema`/`ToggleMedicationInput` added:

```ts
import {
  ArchiveMedicationSchema,
  CreateMedicationSchema,
  DeleteMedicationSchema,
  LogDoseSchema,
  RefillSchema,
  SkipDoseSchema,
  ToggleMedicationSchema,
  type ArchiveMedicationInput,
  type CreateMedicationInput,
  type DeleteMedicationInput,
  type LogDoseInput,
  type RefillInput,
  type SkipDoseInput,
  type ToggleMedicationInput,
} from '@/lib/schemas/medications';
```

(b) Replace the `createMedication` function body (the insert) so it inserts name only:

```ts
export async function createMedication(input: CreateMedicationInput) {
  const parsed = CreateMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('medications')
    .insert({ user_id: userId, name: parsed.name })
    .select()
    .single();

  if (error) failed('createMedication', error);
  revalidatePath('/pills');
  revalidatePath('/today');
  return data;
}
```

(c) Delete the entire `updateMedication` function (current lines 73–97).

(d) Add `toggleMedicationCompletion` immediately after `deleteMedication`:

```ts
export async function toggleMedicationCompletion(input: ToggleMedicationInput) {
  const parsed = ToggleMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase.rpc('toggle_medication_completion', {
    p_user_id: userId,
    p_medication_id: parsed.medication_id,
    p_date: parsed.date,
  });

  if (error) failed('toggleMedicationCompletion', error);
  revalidatePath('/pills');
  revalidatePath('/today');
}
```

Leave `writeDoseLog`, `logDose`, `skipDose`, `refill`, `getUserTimezone`, and the `toUserDate` import unchanged (removed in Task 6).

- [ ] **Step 5: Run the schema test + typecheck**

Run: `npx vitest run src/lib/schemas/__tests__/medications.test.ts && npm run typecheck`
Expected: tests PASS (4); typecheck PASS (no errors — `AddMedicationSheet`, `LogDoseControls`, `RefillButton` still compile).

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas/medications.ts src/lib/actions/medications.ts src/lib/schemas/__tests__/medications.test.ts
git commit -m "feat(pills): add toggle action/schema, simplify createMedication, drop update"
```

---

### Task 4: Pills page — 7-day grid

**Files:**
- Modify: `src/app/(app)/pills/page.tsx`
- Modify: `src/components/pills/MedicationRow.tsx`
- Modify: `src/components/pills/AddMedicationSheet.tsx`
- Create: `src/components/pills/PillDayCell.tsx`

**Interfaces:**
- Consumes: `buildPillWeek`, `medicationGridRows`, `type PillDay`, `type GridRow` (Task 2); `toggleMedicationCompletion`, `CreateMedicationInput`, `CreateMedicationSchema` (Task 3); `toUserDate` (`@/lib/domain/timezone`); `DeleteMedicationButton` (unchanged).
- Produces: `PillDayCell` client component; `MedicationRow` now takes `{ medication: { id; name }, cells: { date; checked }[] }` and renders an `<li>`.

**Context:** Server page fetches name + last-7-days logs, builds the grid with the Task 2 helpers, and renders a weekday header aligned over each row's 7 cells. `MedicationRow` becomes a client component (it hosts interactive cells). After this task `RefillButton.tsx` and `src/lib/domain/medications.ts` are no longer imported by the pills surface (they still exist/compile; deleted in Task 6). No automated test — verified by `npm run typecheck`, `npm run build`, and running the app.

- [ ] **Step 1: Create the grid cell component**

Create `src/components/pills/PillDayCell.tsx`:

```tsx
'use client';

import * as React from 'react';
import { toggleMedicationCompletion } from '@/lib/actions/medications';

export function PillDayCell({
  medicationId,
  date,
  checked,
}: {
  medicationId: string;
  date: string;
  checked: boolean;
}) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    if (pending) return;
    startTransition(async () => {
      try {
        await toggleMedicationCompletion({ medication_id: medicationId, date });
      } catch {
        // revalidatePath('/pills') restores the true state on refresh.
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={checked}
      aria-label={`${checked ? 'Unmark' : 'Mark'} ${date}`}
      data-testid={`cell-${medicationId}-${date}`}
      className={`h-9 w-9 shrink-0 rounded-md border text-[11px] transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary ${
        checked
          ? 'border-transparent bg-text-display text-background'
          : 'border-border-visible text-text-disabled hover:border-text-primary'
      }`}
    >
      {checked ? '✓' : ''}
    </button>
  );
}
```

- [ ] **Step 2: Rewrite `MedicationRow`**

Replace the entire contents of `src/components/pills/MedicationRow.tsx` with:

```tsx
'use client';

import { DeleteMedicationButton } from './DeleteMedicationButton';
import { PillDayCell } from './PillDayCell';

type Cell = { date: string; checked: boolean };

type Props = {
  medication: { id: string; name: string };
  cells: Cell[];
};

export function MedicationRow({ medication: m, cells }: Props) {
  return (
    <li
      data-testid={`medication-row-${m.id}`}
      className="flex items-center gap-3 border-b border-border py-3 last:border-0"
    >
      <span className="min-w-0 flex-1 truncate font-sans text-[14px] text-text-primary">
        {m.name}
      </span>
      <div className="flex items-center gap-1">
        {cells.map((c) => (
          <PillDayCell
            key={c.date}
            medicationId={m.id}
            date={c.date}
            checked={c.checked}
          />
        ))}
      </div>
      <DeleteMedicationButton medicationId={m.id} medicationName={m.name} />
    </li>
  );
}
```

- [ ] **Step 3: Rewrite `AddMedicationSheet` to name-only**

Replace the entire contents of `src/components/pills/AddMedicationSheet.tsx` with:

```tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateMedicationSchema,
  type CreateMedicationInput,
} from '@/lib/schemas/medications';
import { createMedication } from '@/lib/actions/medications';
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

export function AddMedicationSheet() {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { register, handleSubmit, reset, formState } =
    useForm<CreateMedicationInput>({
      resolver: zodResolver(CreateMedicationSchema),
      defaultValues: { name: '' },
    });

  async function onSubmit(values: CreateMedicationInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await createMedication({ name: values.name });
      reset();
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button data-testid="add-medication-trigger">Add pill</Button>}
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add pill</SheetTitle>
          <SheetDescription>Just a name — check it off each day.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="med-name">Name</Label>
            <Input
              id="med-name"
              data-testid="med-name"
              placeholder="Vitamin D"
              {...register('name')}
            />
            {formState.errors.name && (
              <p className="text-xs text-destructive">
                {formState.errors.name.message}
              </p>
            )}
          </div>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={submitting} data-testid="medication-submit">
              {submitting ? 'Saving…' : 'Save pill'}
            </Button>
            <SheetClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

(If `zodResolver(CreateMedicationSchema)` produces a TS generic mismatch, cast as the old file did: `zodResolver(CreateMedicationSchema as never)`.)

- [ ] **Step 4: Rewrite the pills page**

Replace the entire contents of `src/app/(app)/pills/page.tsx` with:

```tsx
import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import { buildPillWeek, medicationGridRows } from '@/lib/domain/pill-grid';
import { AddMedicationSheet } from '@/components/pills/AddMedicationSheet';
import { MedicationRow } from '@/components/pills/MedicationRow';

type MedicationRecord = { id: string; name: string };
type LogRecord = { medication_id: string; log_date: string };

export default async function PillsPage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  const tz = (profile as { timezone?: string } | null)?.timezone ?? 'UTC';

  const today = toUserDate(new Date(), tz);
  const week = buildPillWeek(today);
  const weekStart = week[0].date;

  const [{ data: medsRaw }, { data: logsRaw }] = await Promise.all([
    supabase
      .from('medications')
      .select('id, name')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('medication_logs')
      .select('medication_id, log_date')
      .eq('user_id', userId)
      .gte('log_date', weekStart),
  ]);

  const medications = (medsRaw ?? []) as MedicationRecord[];
  const logs = (logsRaw ?? []) as LogRecord[];
  const rows = medicationGridRows(medications, logs, week);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-medium">Pills</h1>
          <p className="text-sm text-muted-foreground">Check off each day.</p>
        </div>
        <AddMedicationSheet />
      </header>

      {medications.length === 0 ? (
        <div
          data-testid="medications-empty"
          className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground"
        >
          No pills yet. Add one to get started.
        </div>
      ) : (
        <div data-testid="medications-list">
          {/* weekday header — aligned over each row's 7 cells */}
          <div className="flex items-center gap-3 pb-2">
            <span className="min-w-0 flex-1" />
            <div className="flex items-center gap-1">
              {week.map((d) => (
                <span
                  key={d.date}
                  className={`w-9 text-center font-mono text-[10px] uppercase tracking-[0.06em] ${
                    d.isToday ? 'text-text-primary' : 'text-text-disabled'
                  }`}
                >
                  {d.label}
                </span>
              ))}
            </div>
            <span className="w-8" />
          </div>
          <ul>
            {rows.map((r) => (
              <MedicationRow
                key={r.id}
                medication={{ id: r.id, name: r.name }}
                cells={r.cells}
              />
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS — pills surface no longer imports `RefillButton` or `@/lib/domain/medications`; those files still exist and compile.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/pills/page.tsx src/components/pills/MedicationRow.tsx src/components/pills/AddMedicationSheet.tsx src/components/pills/PillDayCell.tsx
git commit -m "feat(pills): 7-day checkbox grid page, name-only add sheet"
```

---

### Task 5: Today page — simplified pill toggle

**Files:**
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/components/today/PillsDueWidget.tsx`
- Create: `src/components/today/PillToggleButton.tsx`

**Interfaces:**
- Consumes: `toggleMedicationCompletion` (Task 3).
- Produces: `PillToggleButton` client component; `PillsDueWidget` now takes `{ medications: { id; name }[], loggedTodayIds: string[], today: string }` and no longer exports `buildDoseRows`/`DoseRow`.

**Context:** The old Today pill flow used a JSON schedule, `scheduled_time`, and `skipped` — all dropped by the migration (the `medication_logs` query even filtered by the now-dropped `taken_at`). Replace with: fetch today's logs by `log_date`, derive logged pill ids, show one row per pill with a single toggle (mirror `HabitsDueWidget` + `LogHabitButton`). After this task `LogDoseControls.tsx` and `LowSupplyBanner.tsx` are unused (deleted in Task 6).

- [ ] **Step 1: Create the toggle button**

Create `src/components/today/PillToggleButton.tsx`:

```tsx
'use client';

import * as React from 'react';
import { toggleMedicationCompletion } from '@/lib/actions/medications';

export function PillToggleButton({
  medicationId,
  date,
  checked,
}: {
  medicationId: string;
  date: string;
  checked: boolean;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setPending(true);
    try {
      await toggleMedicationCompletion({ medication_id: medicationId, date });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      {error && (
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        data-testid={`toggle-pill-${medicationId}`}
        className={`h-8 min-w-[2.5rem] rounded-full px-3.5 font-mono text-[12px] uppercase tracking-[0.06em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary ${
          checked
            ? 'border border-border-visible text-text-secondary hover:border-text-primary hover:text-text-primary'
            : 'bg-text-display text-background hover:opacity-90'
        }`}
      >
        {pending ? '…' : '✓'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `PillsDueWidget`**

Replace the entire contents of `src/components/today/PillsDueWidget.tsx` with:

```tsx
import { PillToggleButton } from './PillToggleButton';
import { WidgetCard, WidgetCount, WidgetEmpty, WidgetLink } from './WidgetCard';

type Medication = { id: string; name: string };

export function PillsDueWidget({
  medications,
  loggedTodayIds,
  today,
}: {
  medications: Medication[];
  loggedTodayIds: string[];
  today: string;
}) {
  const loggedSet = new Set(loggedTodayIds);
  const remaining = medications.filter((m) => !loggedSet.has(m.id)).length;

  return (
    <WidgetCard
      title="[ PILLS DUE ]"
      testid="pills-due-widget"
      right={
        <>
          <WidgetCount>{remaining} LEFT</WidgetCount>
          <WidgetLink href="/pills">ALL</WidgetLink>
        </>
      }
    >
      {medications.length === 0 ? (
        <WidgetEmpty>No pills yet</WidgetEmpty>
      ) : (
        <ul className="-mt-1">
          {medications.map((m) => {
            const logged = loggedSet.has(m.id);
            return (
              <li
                key={m.id}
                data-testid={`dose-${m.id}`}
                className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="truncate font-sans text-[14px] text-text-primary">
                    {m.name}
                  </span>
                  {logged && (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-success">
                      done
                    </span>
                  )}
                </div>
                <PillToggleButton medicationId={m.id} date={today} checked={logged} />
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
```

- [ ] **Step 3: Update `today/page.tsx`**

Make these exact edits in `src/app/(app)/today/page.tsx`:

(a) Remove the medication-domain import and the LowSupplyBanner import; drop `buildDoseRows` from the PillsDueWidget import. Delete these two lines entirely:

```ts
import type { MedicationSchedule } from '@/lib/domain/medications';
import { LowSupplyBanner } from '@/components/today/LowSupplyBanner';
```

and change:

```ts
import { PillsDueWidget, buildDoseRows } from '@/components/today/PillsDueWidget';
```
to:
```ts
import { PillsDueWidget } from '@/components/today/PillsDueWidget';
```

(b) Delete the now-unused `isoWeekdayToday` line:

```ts
const isoWeekdayToday = Number(formatInTimeZone(now, tz, 'i'));
```

(c) Change the medications query `.select(...)` from:

```ts
      .select('id, name, dosage, schedule_json, supply_count, supply_warn_days')
```
to:
```ts
      .select('id, name')
```

(d) Replace the entire `medication_logs` query in the `Promise.all` (it filtered by the dropped `taken_at`):

```ts
    supabase
      .from('medication_logs')
      .select('medication_id, scheduled_time, skipped')
      .eq('user_id', userId)
      .gte('taken_at', startUtc.toISOString())
      .lt('taken_at', endUtc.toISOString()),
```
with:
```ts
    supabase
      .from('medication_logs')
      .select('medication_id, log_date')
      .eq('user_id', userId)
      .eq('log_date', today),
```

(e) Replace the `medications` type cast block:

```ts
  const medications = (medicationsResult.data ?? []) as Array<{
    id: string;
    name: string;
    dosage: string;
    schedule_json: MedicationSchedule;
    supply_count: number | null;
    supply_warn_days: number;
  }>;
```
with:
```ts
  const medications = (medicationsResult.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
```

(f) Replace the `doseLogs` type cast block:

```ts
  const doseLogs = (todayDoseLogsResult.data ?? []) as Array<{
    medication_id: string;
    scheduled_time: string | null;
    skipped: boolean;
  }>;
```
with:
```ts
  const doseLogs = (todayDoseLogsResult.data ?? []) as Array<{
    medication_id: string;
    log_date: string;
  }>;
  const loggedPillIds = doseLogs.map((l) => l.medication_id);
  const loggedPillSet = new Set(loggedPillIds);
```

(g) Replace the `pendingPills` derivation:

```ts
  const pendingPills = buildDoseRows(
    medications,
    doseLogs,
    isoWeekdayToday,
  ).filter((r) => r.state === 'pending').length;
```
with:
```ts
  const pendingPills = medications.filter((m) => !loggedPillSet.has(m.id)).length;
```

(h) Delete the LowSupplyBanner render line:

```tsx
      <LowSupplyBanner medications={medications} />
```

(i) Replace the `PillsDueWidget` render:

```tsx
        <PillsDueWidget
          medications={medications}
          logsToday={doseLogs}
          isoWeekdayToday={isoWeekdayToday}
        />
```
with:
```tsx
        <PillsDueWidget
          medications={medications}
          loggedTodayIds={loggedPillIds}
          today={today}
        />
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS. `LogDoseControls.tsx` and `LowSupplyBanner.tsx` are now unused but still compile (their imports — `logDose`/`skipDose`/`refill`, `supplyDaysRemaining` — still exist).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/today/page.tsx src/components/today/PillsDueWidget.tsx src/components/today/PillToggleButton.tsx
git commit -m "feat(pills): simplified Today pill toggle (one row per pill)"
```

---

### Task 6: Delete dead code + final verification

**Files:**
- Delete: `src/components/pills/RefillButton.tsx`, `src/components/today/LogDoseControls.tsx`, `src/components/today/LowSupplyBanner.tsx`, `src/lib/domain/medications.ts`
- Modify: `src/lib/actions/medications.ts`, `src/lib/schemas/medications.ts`, `src/lib/domain/index.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: final trimmed `actions/medications.ts` (only `createMedication`, `archiveMedication`, `deleteMedication`, `toggleMedicationCompletion`) and `schemas/medications.ts` (only Create/Archive/Delete/Toggle).

**Context:** Everything removed here is confirmed unused after Tasks 4–5. `updateMedication`/`UpdateMedication` and medication domain symbols have **no** importers outside the medication files (verified by grep); nothing imports medication symbols via the `@/lib/domain` barrel.

- [ ] **Step 1: Delete the dead files**

```bash
git rm src/components/pills/RefillButton.tsx \
       src/components/today/LogDoseControls.tsx \
       src/components/today/LowSupplyBanner.tsx \
       src/lib/domain/medications.ts
```

- [ ] **Step 2: Trim `actions/medications.ts` to the final shape**

Replace the entire contents of `src/lib/actions/medications.ts` with:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { requireUserId } from '@/lib/auth/server-user';
import {
  ArchiveMedicationSchema,
  CreateMedicationSchema,
  DeleteMedicationSchema,
  ToggleMedicationSchema,
  type ArchiveMedicationInput,
  type CreateMedicationInput,
  type DeleteMedicationInput,
  type ToggleMedicationInput,
} from '@/lib/schemas/medications';

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

export async function createMedication(input: CreateMedicationInput) {
  const parsed = CreateMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { data, error } = await supabase
    .from('medications')
    .insert({ user_id: userId, name: parsed.name })
    .select()
    .single();

  if (error) failed('createMedication', error);
  revalidatePath('/pills');
  revalidatePath('/today');
  return data;
}

export async function archiveMedication(input: ArchiveMedicationInput) {
  const parsed = ArchiveMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('medications')
    .update({ archived_at: parsed.archive ? new Date().toISOString() : null })
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('archiveMedication', error);
  revalidatePath('/pills');
  revalidatePath('/today');
}

export async function deleteMedication(input: DeleteMedicationInput) {
  const parsed = DeleteMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', parsed.id)
    .eq('user_id', userId);

  if (error) failed('deleteMedication', error);
  revalidatePath('/pills');
  revalidatePath('/today');
}

export async function toggleMedicationCompletion(input: ToggleMedicationInput) {
  const parsed = ToggleMedicationSchema.parse(input);
  const { supabase, userId } = await authedClient();

  const { error } = await supabase.rpc('toggle_medication_completion', {
    p_user_id: userId,
    p_medication_id: parsed.medication_id,
    p_date: parsed.date,
  });

  if (error) failed('toggleMedicationCompletion', error);
  revalidatePath('/pills');
  revalidatePath('/today');
}
```

- [ ] **Step 3: Trim `schemas/medications.ts` to the final shape**

Replace the entire contents of `src/lib/schemas/medications.ts` with:

```ts
import { z } from 'zod';

export const CreateMedicationSchema = z.object({
  name: z.string().min(1).max(80),
});
export type CreateMedicationInput = z.infer<typeof CreateMedicationSchema>;

export const ArchiveMedicationSchema = z.object({
  id: z.string().uuid(),
  archive: z.boolean().default(true),
});
export type ArchiveMedicationInput = z.infer<typeof ArchiveMedicationSchema>;

export const DeleteMedicationSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteMedicationInput = z.infer<typeof DeleteMedicationSchema>;

export const ToggleMedicationSchema = z.object({
  medication_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
});
export type ToggleMedicationInput = z.infer<typeof ToggleMedicationSchema>;
```

- [ ] **Step 4: Remove the medications re-export from the domain barrel**

In `src/lib/domain/index.ts`, delete this line:

```ts
export * from './medications';
```

- [ ] **Step 5: Confirm nothing references the deleted symbols**

Run:
```bash
grep -rn "domain/medications\|MedicationSchedule\|supplyDaysRemaining\|nextDoseTime\|buildDoseRows\|LogDoseControls\|LowSupplyBanner\|RefillButton\|logDose\|skipDose\|\brefill\b\|updateMedication" src
```
Expected: **no matches** (only possible match would be inside this plan/spec docs, which are under `docs/`, not `src/`).

- [ ] **Step 6: Full verification**

Run: `npm run typecheck && npm run lint && npm run test:run && npm run build`
Expected: typecheck PASS, lint PASS, all unit tests PASS (including the new `pill-grid` and `medications` schema tests), build PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(pills): remove dosage/schedule/supply/refill dead code"
```

---

## Manual verification (after all tasks)

Run the app (`npm run dev`) and confirm:
1. `/pills` shows a weekday header and one row per pill with 7 toggle cells; today's column is highlighted.
2. Clicking a cell fills/empties it and persists across a refresh (toggle works for past days too).
3. "Add pill" sheet has a single Name field; adding a pill makes it appear in the grid.
4. Deleting a pill removes it and its logs.
5. `/today` "PILLS DUE" widget lists pills, shows "done" + N LEFT correctly, and the day-strip "pending pills" count matches.
6. Settings → export still downloads (medications/medication_logs present with the reduced columns).
```
