# Simplify Pills to a habit-style daily checkbox

**Date:** 2026-06-27
**Status:** Approved (design)
**Route:** `/pills` · **Tables:** `medications`, `medication_logs`

## Problem

The "pills" feature (entity name `medication` in code/DB) is far heavier than the
user needs. It carries dosage, a JSON schedule of times-of-day, supply-on-hand,
warn-at-days-left, a refill flow, and Take/Skip dose logging that allows multiple
log rows per day. The user wants pills to be **as simple as habits**: just a name
with a checkbox per day.

The habits feature already contains the exact mechanism we want — the dashboard's
`habit_completions` table with a `UNIQUE(user_id, habit_id, date)` constraint plus
the atomic `toggle_habit_completion(...)` RPC (delete-or-insert, one row per day).
We mirror that pattern for medications.

## Goals

- A pill is **just a name**. No dosage, schedule, supply, warn-days, refill, notes.
- Checking off a pill for a day is a single toggle backed by one row per
  `(user, medication, day)`.
- The `/pills` page shows a **7-day grid**: each pill is a row of 7 toggleable
  checkboxes (last 7 days, today rightmost), in the existing Nothing design language.
- The Today page keeps working with a simplified "due today" check toggle.

## Non-goals

- No table/route rename (`medications`, `medication_logs`, `/pills` stay).
- No per-pill frequency/schedule (pure daily — checkable any day).
- No emoji/color per pill (name only).
- No edit-name UI (create + delete only, matching today's pills page).

## Decisions (from brainstorming)

1. **Checkbox UX:** 7-day grid on the Pills page (toggle any of the last 7 days).
2. **Frequency:** Pure daily, name only.
3. **Migration:** Drop the now-unused columns (destructive; existing values in
   those columns are discarded).

## Data model — migration `016_simplify_medications.sql`

Applied to the live DB via the Supabase MCP **and** committed as a file (the live
DB is known to contain objects absent from migrations, so the file is the record
of intent; the MCP applies it).

### `medications`

Drop columns: `dosage`, `schedule_json`, `supply_count`, `supply_warn_days`,
`notes`.

Final shape:

```
id          UUID PK
user_id     UUID NOT NULL -> auth.users(id) ON DELETE CASCADE
name        TEXT NOT NULL
archived_at TIMESTAMPTZ
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Existing index `idx_medications_user_active` and RLS policies are unchanged.

### `medication_logs` — becomes a pure per-day checkbox table

1. **Dedupe first** (a unique constraint will be added and the table currently
   permits multiple rows per day): keep the earliest row per
   `(user_id, medication_id, log_date)`:

   ```sql
   DELETE FROM public.medication_logs
   WHERE id IN (
     SELECT id FROM (
       SELECT id, row_number() OVER (
         PARTITION BY user_id, medication_id, log_date
         ORDER BY created_at, id
       ) AS rn
       FROM public.medication_logs
     ) t WHERE t.rn > 1
   );
   ```

2. Drop columns: `taken_at`, `scheduled_time`, `skipped`, `note`.

3. Add `CONSTRAINT medication_logs_user_med_date_key UNIQUE (user_id, medication_id, log_date)`.

Final shape:

```
id            UUID PK
user_id       UUID NOT NULL -> auth.users(id) ON DELETE CASCADE
medication_id UUID NOT NULL -> medications(id) ON DELETE CASCADE
log_date      DATE NOT NULL
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE (user_id, medication_id, log_date)
```

Existing indexes (`idx_medication_logs_user_date`, `idx_medication_logs_med_date`)
and RLS policies are unchanged.

### RPC `toggle_medication_completion` (copy of `toggle_habit_completion`)

```sql
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

## Schemas — `src/lib/schemas/medications.ts`

- `CreateMedicationSchema = z.object({ name: z.string().min(1).max(80) })`
- `DeleteMedicationSchema` — keep (`{ id: uuid }`).
- `ArchiveMedicationSchema` — keep.
- **Add** `ToggleMedicationSchema = z.object({ medication_id: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })`.
- **Delete** `MedicationScheduleSchema`, `LogDoseSchema`, `SkipDoseSchema`,
  `RefillSchema`, `UpdateMedicationSchema`, and all dosage/schedule/supply/notes
  fields.

## Actions — `src/lib/actions/medications.ts`

- Keep: `createMedication({ name })` (INSERT `medications(user_id, name)`),
  `deleteMedication`, `archiveMedication`.
- **Add** `toggleMedicationCompletion({ medication_id, date })`:
  validate with `ToggleMedicationSchema`, resolve `user_id`, call
  `supabase.rpc('toggle_medication_completion', { p_user_id, p_medication_id, p_date })`,
  then `revalidatePath('/pills')` and `revalidatePath('/today')`.
- **Delete:** `logDose`, `skipDose`, `refill`, `writeDoseLog`, `updateMedication`.

## Pills page — `src/app/(app)/pills/page.tsx` (server)

- Fetch `profiles.timezone`.
- Compute the 7 dates ending today (in the user's timezone), today rightmost, as
  `YYYY-MM-DD` strings. Earliest of those is `sinceISO`.
- Fetch `medications` (`id, name`, `archived_at IS NULL`, ordered `created_at`).
- Fetch `medication_logs` (`medication_id, log_date`) where `log_date >= sinceISO`.
- Bucket logs into a `Set` of `${medication_id}|${log_date}` for O(1) lookup.
- Render: a header row of 7 weekday labels (today highlighted) and one
  `MedicationRow` per pill. Empty state mirrors the habits/empty pattern.
- Remove all `nextDoseTime`/schedule/supply logic.

### `MedicationRow.tsx` — now a client component

- Props: `{ medication: { id, name }, days: { date: string; checked: boolean }[] }`.
- Renders the name plus 7 checkbox toggles. Tapping a box calls
  `toggleMedicationCompletion({ medication_id, date })` (optimistic via
  `useTransition`/`router.refresh` or server-action revalidate). Touch targets
  ≥ 44px for a11y. Visual style matches the existing Nothing design tokens.
- Renders `DeleteMedicationButton` (kept as-is).

### `AddMedicationSheet.tsx`

- Reduce to a single **name** field. Remove dosage, times-of-day, frequency,
  supply, warn-days, notes. `onSubmit` → `createMedication({ name })`.

### Deletions

- `src/components/pills/RefillButton.tsx` — delete.
- `src/lib/domain/medications.ts` — delete (all functions become dead).

## Today page cleanup (required for the app to compile)

- `src/components/today/PillsDueWidget.tsx`: drop `buildDoseRows`/schedule logic.
  Show one row per pill **not yet logged today**, each with a single check toggle
  calling `toggleMedicationCompletion({ medication_id, today })`. Mirror
  `HabitsDueWidget`.
- `src/components/today/LogDoseControls.tsx`: replace Take/Skip with a single
  toggle (or fold into the widget).
- `src/components/today/LowSupplyBanner.tsx`: delete; remove its import/use from
  `today/page.tsx`.
- `src/app/(app)/today/page.tsx`: fetch `medications(id, name)` +
  `medication_logs(medication_id, log_date)` for today; "pending pills" = pills
  with no log today. Remove supply/schedule/`nextDoseTime` usage and the
  `LowSupplyBanner`.
- `src/components/today/DayStrip.tsx`: `pendingPills` = count of pills without
  today's log (semantics unchanged; data source simplified).

## Unchanged (verified)

- `src/app/api/export/route.ts` uses `select('*')` on `medications` /
  `medication_logs` — dropping columns just yields fewer fields. **No change.**
- `AppSidebar.tsx`, `JarvisDashboard.tsx`, `ShortcutsProvider.tsx` reference the
  `/pills` route only. **No change.**

## Testing

No medication tests exist today. Add unit tests (Vitest) for the pure logic, TDD:

- 7-day window builder (given a timezone + "today", returns 7 `YYYY-MM-DD`
  strings, today rightmost, DST-safe).
- Log-set lookup: a pill row maps each of its 7 days to checked/unchecked from the
  fetched `medication_logs` set.

The toggle RPC is exercised manually (and via the Supabase MCP) since it's a thin
delete-or-insert; component interaction is verified by running the app.

## Risks

- **Destructive migration:** dropped columns lose their data. Acceptable per the
  user's decision; this is a single-user personal app.
- **Unique constraint vs existing dupes:** handled by the dedupe step before the
  constraint is added.
- **Live DB drift:** apply via MCP and verify the columns/constraint/RPC exist
  after running, since the live DB may differ from the migrations folder.
