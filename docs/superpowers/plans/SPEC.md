# SPEC — Tracker

The constitution. Ralph reads this every iteration. Edits to this file change the rules.

## Stack

- **Next.js 15** — App Router, Server Components by default, Server Actions for mutations.
- **TypeScript** — strict mode, no implicit any, no `any` without justification.
- **Supabase** — Postgres + Auth + RLS. Local dev via `supabase start`. Migrations in `supabase/migrations/`.
- **Tailwind CSS v4** + **shadcn/ui** — components installed via `pnpm dlx shadcn@latest add <component>`, not via npm.
- **Vitest** — unit tests. **Playwright** — e2e. **MSW** — only if mocking external APIs (we don't currently).
- **pnpm** — package manager. Never `npm` or `yarn`.
- **date-fns** — all date math. Never `moment`. Never raw `Date` arithmetic for anything beyond `new Date()`.
- **Zod** — runtime validation at all server action boundaries.

No other deps without a PLAN.md task that justifies them.

## Project structure

```
src/
  app/
    (auth)/
      login/page.tsx
      callback/route.ts
    (app)/
      layout.tsx              # auth-gated, sidebar
      today/page.tsx          # default landing
      habits/...
      pills/...
      goals/...
      plans/...
      focus/...
    api/                      # only when Server Actions don't fit (webhooks, cron)
  components/
    ui/                       # shadcn components, do not edit
    <feature>/                # feature-scoped components
  lib/
    supabase/
      client.ts               # browser client
      server.ts               # server component client
      action.ts               # server action client (cookies-based)
      admin.ts                # service_role, server-only, marked "import 'server-only'"
    database.types.ts         # generated, do not edit
    actions/
      habits.ts
      medications.ts
      goals.ts
      events.ts
      focus.ts
    domain/                   # pure logic, no I/O
      streak.ts
      schedule.ts
      timezone.ts
    schemas/                  # zod schemas matching DB types
  middleware.ts               # auth refresh
supabase/
  migrations/
  seed.sql
tests/
  unit/
  e2e/
```

## Database schema

All tables: `id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `created_at timestamptz not null default now()`. RLS enabled on every table. Policies: select/insert/update/delete each gated on `auth.uid() = user_id`.

### `profiles`
- `user_id uuid pk references auth.users(id) on delete cascade` (not a separate id)
- `timezone text not null default 'UTC'` (IANA name, e.g. `Asia/Tashkent`)
- `display_name text`
- `created_at`, `updated_at`

Row created via auth trigger on `auth.users` insert.

### `habits`
- `name text not null`
- `kind text not null check (kind in ('check','counter','timer'))`
- `target numeric` — null for check; target count for counter; target seconds for timer
- `unit text` — e.g. `'reps'`, `'glasses'`; null for check/timer
- `frequency_json jsonb not null default '{"type":"daily"}'`
  - `{"type":"daily"}`
  - `{"type":"weekly","days":[1,3,5]}` — ISO weekday numbers
  - `{"type":"x_per_week","count":4}`
- `color text not null default 'gray'`
- `archived_at timestamptz`

### `habit_logs`
- `habit_id uuid not null references habits(id) on delete cascade`
- `logged_at timestamptz not null default now()`
- `log_date date not null` — denormalized in user's TZ for fast "today" queries
- `value numeric not null` — 1 for check, count for counter, seconds for timer
- `note text`
- Index: `(user_id, log_date desc)`, `(habit_id, log_date desc)`

### `medications`
- `name text not null`
- `dosage text not null` — free text e.g. `"500mg"`, `"2 puffs"`
- `schedule_json jsonb not null` — `{"times":["08:00","20:00"],"days":"daily"}` or `{"times":["08:00"],"days":[1,3,5]}`
- `supply_count numeric` — current pills/doses on hand
- `supply_warn_days int default 7` — warn when supply ÷ daily_doses ≤ this
- `notes text`
- `archived_at timestamptz`

### `medication_logs`
- `medication_id uuid not null references medications(id) on delete cascade`
- `taken_at timestamptz not null default now()`
- `log_date date not null`
- `scheduled_time time` — which scheduled dose this corresponds to (null for ad-hoc)
- `skipped boolean not null default false`
- `note text`

### `goals`
- `title text not null`
- `description text`
- `target_date date`
- `status text not null check (status in ('active','done','abandoned')) default 'active'`
- `parent_goal_id uuid references goals(id) on delete set null` — sub-goals
- `linked_habit_id uuid references habits(id) on delete set null` — auto-progress
- `progress_target numeric` — e.g. `12` (books)
- `progress_unit text`

### `events` (future plans / appointments)
- `title text not null`
- `description text`
- `starts_at timestamptz not null`
- `ends_at timestamptz`
- `kind text not null default 'event'` — `'event' | 'appointment' | 'milestone'`
- `linked_goal_id uuid references goals(id) on delete set null`

### `focus_sessions`
- `started_at timestamptz not null default now()`
- `ended_at timestamptz`
- `planned_minutes int not null`
- `completed boolean not null default false`
- `intent text` — what they're focusing on
- `linked_goal_id uuid references goals(id) on delete set null`
- `linked_habit_id uuid references habits(id) on delete set null`

## RLS template

For every table:
```sql
alter table <t> enable row level security;
create policy "<t>_select_own" on <t> for select using (auth.uid() = user_id);
create policy "<t>_insert_own" on <t> for insert with check (auth.uid() = user_id);
create policy "<t>_update_own" on <t> for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "<t>_delete_own" on <t> for delete using (auth.uid() = user_id);
```

`profiles` is the exception — gate on `auth.uid() = user_id` (the PK).

## Auth

- Magic link via Supabase. No password auth.
- Trigger on `auth.users` insert creates a `profiles` row.
- `middleware.ts` refreshes the session cookie on every request via `@supabase/ssr`.
- Server Components use `lib/supabase/server.ts`. Server Actions use `lib/supabase/action.ts`. Browser components use `lib/supabase/client.ts`.

## Server Actions conventions

```ts
'use server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/action';

const Input = z.object({ /* ... */ });

export async function createHabit(input: z.infer<typeof Input>) {
  const parsed = Input.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHENTICATED');

  const { data, error } = await supabase.from('habits').insert({ ...parsed, user_id: user.id }).select().single();
  if (error) throw error;
  return data;
}
```

- Always validate input with Zod.
- Always check auth even though RLS would block — fail fast with a clear error.
- Always pass `user_id` explicitly on insert. RLS will enforce it; explicit is safer.
- Return the row. Let the caller decide what to do.
- Errors throw. The component catches and shows a toast.

## Domain logic — `lib/domain/`

Pure functions, no I/O, no Supabase imports. These are the most-tested files in the codebase.

- `streak.ts` — given log dates and frequency, compute current streak and longest streak.
- `schedule.ts` — given a frequency_json or schedule_json and a date range, return the dates a habit/medication is due.
- `timezone.ts` — convert UTC timestamps to user TZ dates (`log_date` derivation).

## Timezone rule

All timestamps stored as UTC (`timestamptz`). The user's TZ lives in `profiles.timezone`. The "today" boundary is computed in user TZ. Always derive `log_date` server-side from `logged_at` + user TZ; never trust the client's date.

## Testing

- Unit: every file in `lib/domain/`, every server action's input validation.
- E2E (Playwright): the four core flows — log a habit, log a medication, complete a focus session, mark a goal done.
- Tests run against a local Supabase (`supabase start`). CI: `pnpm verify` script runs `supabase db reset --local` before tests.
- RLS test: every feature includes a test that user A cannot read/write user B's rows. **Mandatory.** No feature ships without one.

## `pnpm verify`

```json
"verify": "pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:e2e"
```

If any step fails, the iteration fails.

## Anti-patterns — Ralph must not do these

- A single polymorphic `items` table with a `kind` column and `metadata jsonb`. We have typed tables for a reason.
- Client components doing direct Supabase mutations. Mutations go through Server Actions.
- "use client" on the root layout. Server Components by default; opt into client only for interactivity.
- Hardcoded route strings sprinkled in components. Define them in `lib/routes.ts`.
- Inline SQL in server actions. Use the Supabase query builder; complex queries become Postgres functions or views.
- Unhandled promise rejections in client components. Wrap in try/catch and surface via toast.
- `as` type assertions. Validate with Zod or refine the type properly.
