# Habits Require a Goal — Design

Date: 2026-04-27
Status: Approved (auto mode), pending spec review.

## Problem

A habit (a "discipline" in the dashboard's vocabulary) can currently be created without any tie to a goal. The user wants this prevented at both the database and UI layers — every habit must belong to a goal at the moment of creation, and orphan habits must not be representable in the schema.

## Current state

- `habits` has no `goal_id` column. The relationship runs the other way: `goals.linked_habit_id` is an optional FK from a goal to its progress-driving habit (one habit per goal at most).
- Two creation paths exist:
  - Legacy: `src/components/dashboard/tabs/DisciplineTab.tsx` "ADD HABIT" form → `addHabit(formData)` in `src/actions/discipline.ts` (emoji + name only).
  - SPEC-aligned: `src/components/habits/AddHabitSheet.tsx` on `/habits` → `createHabit(input)` in `src/lib/actions/habits.ts` (kind, target, unit, frequency, color, emoji).
- `CreateHabitSchema` in `src/lib/schemas/habits.ts` does not include any goal field.

## Constraint

Habit ownership flips: a habit belongs to a goal. The link from the goal side (`goals.linked_habit_id`) stays optional and keeps its existing meaning — which habit auto-tracks progress for that goal — and is logically expected to satisfy `linked_habit.goal_id = goal.id` when set, but we will not enforce that with a trigger in this change.

## Database

New migration: `supabase/migrations/013_habits_require_goal.sql`.

1. `ALTER TABLE public.habits ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE;` — nullable for the duration of the migration.
2. Backfill, in order:
   1. For every habit `h` such that some goal `g` has `g.linked_habit_id = h.id` and `g.user_id = h.user_id`, set `h.goal_id = g.id`. If a habit is referenced by multiple goals (shouldn't happen by current usage, but possible), pick the earliest-created goal deterministically with `ORDER BY g.created_at ASC LIMIT 1` per habit.
   2. For every distinct `user_id` that still owns at least one habit with `goal_id IS NULL`, insert one new row into `goals` with `title = 'General'`, `status = 'active'`, `user_id` set, all other columns default. Capture its id.
   3. Update those orphan habits' `goal_id` to that user's new "General" goal id.
3. `ALTER TABLE public.habits ALTER COLUMN goal_id SET NOT NULL;`.
4. `CREATE INDEX idx_habits_user_goal ON public.habits (user_id, goal_id);`.

Notes:

- ON DELETE CASCADE on `habits.goal_id`: deleting a goal deletes its habits (and `habit_logs` cascade from there). This is consistent with the new ownership model. Cross-check: `goals.linked_habit_id` uses ON DELETE SET NULL, which still works — deleting a habit nulls the goal's progress link, deleting a goal cascades the habits.
- `linked_habit_id` is **not** dropped or renamed.
- No trigger to enforce `goals.linked_habit_id → habits.goal_id` consistency. Out of scope; can be added later if real divergence shows up.

## Schemas (`src/lib/schemas/habits.ts`)

- `CreateHabitSchema`: add `goal_id: z.string().uuid()` (required).
- `UpdateHabitSchema`: inherits `.partial()`, so `goal_id` becomes optional there. No further change needed; we allow reassigning a habit to a different goal.

## Server actions

Both actions must validate that the chosen `goal_id` belongs to the calling user before inserting. The FK alone does not prevent referencing another user's goal id, since Postgres FK checks bypass RLS. Reading the goal back through the user's RLS-scoped client gives us this check for free: a `select id from goals where id = $goal_id` on the user's client returns no row when the goal belongs to someone else, and we throw.

- `src/lib/actions/habits.ts` `createHabit`:
  - Zod validates `goal_id` is a uuid (missing field → standard zod error).
  - Before insert: `supabase.from('goals').select('id').eq('id', parsed.goal_id).maybeSingle()`. If no row, throw `GOAL_NOT_FOUND`.
  - Insert with `goal_id: parsed.goal_id`.
- `src/actions/discipline.ts` `addHabit`:
  - Read `goal_id` from `FormData`. If missing/empty, return `{ error: 'GOAL_REQUIRED' }`.
  - Same ownership check: `select id from goals where id = goal_id`; if no row, return `{ error: 'GOAL_NOT_FOUND' }`.
  - Insert `goal_id` alongside `name`/`emoji`. Other columns keep their `004_tracker_extend.sql` defaults (`kind = 'check'`, etc.).

## UI

### `AddHabitSheet` (`/habits` page)

- New prop: `goalOptions: Array<{ id: string; label: string }>`.
- `app/(app)/habits/page.tsx` adds a goals query (active, non-archived analog: `status in ('active')`) and passes results in.
- Form gets a required `<select>` "Goal" rendered with `Controller`, between Name and Kind.
- Form schema includes `goal_id: z.string().uuid()` and shows a field error when blank.
- If `goalOptions.length === 0`: hide the form, show an inline message "Create a goal first" with a `<Link href="/goals">` "Go to Goals". The "Add habit" trigger button is still visible, but the sheet contents render the empty state.

### `DisciplineTab` (legacy dashboard)

- Component receives `goals: Goal[]` as a new prop (already loaded in dashboard for `GoalsTab`; thread it through `JarvisDashboard`).
- "ADD HABIT" inline form gets a `<select name="goal_id" required>` populated with active goals.
- If no active goals: replace the form with a single line "Create a goal first" + `<Link href="/goals">` "Go to Goals".
- `handleAddHabit` continues to call `addHabit(formData)`; surface `{ error }` via a small inline message under the form.

### `AddGoalSheet`

- No changes. `linked_habit_id` stays optional, semantics unchanged.

## Types

- `src/types/index.ts` `Habit`: add `goal_id: string`. Update any literal `Habit` mocks in tests.

## Tests

- Unit (`vitest`):
  - `CreateHabitSchema` rejects payload missing `goal_id` and rejects non-UUID `goal_id`.
  - `CreateHabitSchema` accepts a payload with a valid UUID `goal_id`.
- E2E (`playwright`):
  - From `/habits` with no goals: opening "Add habit" shows the empty state with a Goals link; the habit form is not present.
  - From `/habits` with at least one active goal: the form requires goal selection; submitting without one shows the field error; selecting a goal and submitting creates the habit; the habit appears in the list.
- Cross-tenant: explicit test that user A calling `createHabit({ goal_id: <user B's goal> })` throws `GOAL_NOT_FOUND` (the goal-ownership check in the action catches this; FK alone would not).
- RLS: existing pattern — user A cannot read user B's habits.

## Out of scope

- Removing or unifying `DisciplineTab` with `/habits`.
- Cross-row trigger enforcing `goals.linked_habit_id → habits.goal_id`.
- Changes to `habit_completions`, `habit_logs`, or scoring logic.
- Migrating older `habit_completions` rows to `habit_logs`.

## Risks

- Two writers (`addHabit` legacy and `createHabit` SPEC) means schema changes have to be applied in both. Documented in the implementation plan.
- The auto-created "General" goal can leave a stray active goal for any user whose orphan habits all later get deleted. Acceptable; the user can rename or archive it.

## Rollout

- Single migration, applied via `supabase db reset` locally and the dashboard SQL editor in prod (project convention; see migration headers).
- No feature flag — the schema and UI must move together.
