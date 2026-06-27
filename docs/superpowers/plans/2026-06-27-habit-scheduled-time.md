# Habit Scheduled Time + Emoji Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give timer-kind habits an optional wall-clock time, group the `/habits` page by part of day, and remove the habit emoji concept (UI + DB column).

**Architecture:** A pure domain module buckets `"HH:MM"` times into Morning/Afternoon/Evening/Night/Anytime and groups habits for display. A new nullable `scheduled_time TIME` column stores the time; only `kind = 'timer'` habits may set one (enforced in schema on create, defensively in the update action). An inline popover control on timer cards and a conditional field in the Add form write the time. Emoji removal drops the `habits.emoji` column after every live reader is cleaned.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript, Zod 4, react-hook-form, base-ui Popover, Supabase (Postgres + RLS), Vitest.

## Global Constraints

- **Next.js is non-standard here.** Per `AGENTS.md`, this Next.js has breaking changes vs. training data. Before using any Next API (server actions from client components, `revalidatePath`), consult `node_modules/next/dist/docs/`. The code below follows patterns already present in the repo — do not invent new ones.
- **Time format:** wall-clock `"HH:MM"`, 24-hour. Stored as Postgres `TIME`. No timezone math — `TIME` is zoneless.
- **Kind gating:** only `kind = 'timer'` habits may have a `scheduled_time`. Check/counter are always Anytime.
- **Day-part buckets:** Morning 05:00–11:59, Afternoon 12:00–16:59, Evening 17:00–21:59, Night 22:00–04:59 (wraps midnight), Anytime = null. Render order: Morning → Afternoon → Evening → Night → Anytime. Empty sections dropped.
- **Headers:** plain mono caps, no glyphs/emoji.
- **TDD, frequent commits, DRY, YAGNI.** Run `npm run test:unit` (Vitest), `npm run typecheck`, `npm run lint` as specified.
- **Migration safety:** the `emoji` column is dropped (Task 7) only after all readers are removed (Tasks 3–6). The `scheduled_time` column is added (Task 2) before any code selects/persists it.

---

### Task 1: Day-part domain module

**Files:**
- Create: `src/lib/domain/day-part.ts`
- Test: `src/lib/domain/__tests__/day-part.test.ts`

**Interfaces:**
- Produces:
  - `type DayPart = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime'`
  - `const DAY_PART_ORDER: DayPart[]`
  - `const DAY_PART_LABEL: Record<DayPart, string>`
  - `function dayPartOf(time: string | null): DayPart`
  - `function groupHabitsByDayPart<T>(items: T[], getTime: (item: T) => string | null): Array<{ part: DayPart; label: string; items: T[] }>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/domain/__tests__/day-part.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dayPartOf, groupHabitsByDayPart, DAY_PART_ORDER } from '../day-part';

describe('dayPartOf', () => {
  it('buckets boundary times correctly', () => {
    expect(dayPartOf('05:00')).toBe('morning');
    expect(dayPartOf('11:59')).toBe('morning');
    expect(dayPartOf('12:00')).toBe('afternoon');
    expect(dayPartOf('16:59')).toBe('afternoon');
    expect(dayPartOf('17:00')).toBe('evening');
    expect(dayPartOf('21:59')).toBe('evening');
    expect(dayPartOf('22:00')).toBe('night');
    expect(dayPartOf('04:59')).toBe('night');
    expect(dayPartOf('00:00')).toBe('night');
    expect(dayPartOf('23:30')).toBe('night');
  });

  it('returns anytime for null', () => {
    expect(dayPartOf(null)).toBe('anytime');
  });
});

describe('groupHabitsByDayPart', () => {
  const get = (h: { id: string; t: string | null }) => h.t;

  it('orders sections canonically and drops empty ones', () => {
    const items = [
      { id: 'm', t: '07:00' },
      { id: 'e', t: '20:00' },
      { id: 'a', t: null },
    ];
    const sections = groupHabitsByDayPart(items, get);
    expect(sections.map((s) => s.part)).toEqual(['morning', 'evening', 'anytime']);
    // afternoon and night are empty -> absent
    expect(sections.find((s) => s.part === 'afternoon')).toBeUndefined();
  });

  it('sorts within a section by time ascending', () => {
    const items = [
      { id: 'b', t: '09:30' },
      { id: 'a', t: '06:00' },
      { id: 'c', t: '11:00' },
    ];
    const [morning] = groupHabitsByDayPart(items, get);
    expect(morning.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts the night section across the midnight wrap', () => {
    const items = [
      { id: 'late', t: '00:30' },
      { id: 'early-eve', t: '22:00' },
      { id: 'predawn', t: '04:00' },
      { id: 'mid', t: '23:00' },
    ];
    const [night] = groupHabitsByDayPart(items, get);
    expect(night.part).toBe('night');
    expect(night.items.map((i) => i.id)).toEqual(['early-eve', 'mid', 'late', 'predawn']);
  });

  it('keeps anytime last and preserves input order there', () => {
    const items = [
      { id: 'a1', t: null },
      { id: 'm', t: '08:00' },
      { id: 'a2', t: null },
    ];
    const sections = groupHabitsByDayPart(items, get);
    const anytime = sections[sections.length - 1];
    expect(anytime.part).toBe('anytime');
    expect(anytime.items.map((i) => i.id)).toEqual(['a1', 'a2']);
  });

  it('exposes a canonical order constant ending in anytime', () => {
    expect(DAY_PART_ORDER[DAY_PART_ORDER.length - 1]).toBe('anytime');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/lib/domain/__tests__/day-part.test.ts`
Expected: FAIL — cannot resolve `../day-part`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/domain/day-part.ts`:

```ts
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';

export const DAY_PART_ORDER: DayPart[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
  'anytime',
];

export const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: 'MORNING',
  afternoon: 'AFTERNOON',
  evening: 'EVENING',
  night: 'NIGHT',
  anytime: 'ANYTIME',
};

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Bucket an "HH:MM" (or null) into a day-part. Night wraps midnight. */
export function dayPartOf(time: string | null): DayPart {
  if (!time) return 'anytime';
  const mins = toMinutes(time);
  if (mins >= 300 && mins < 720) return 'morning'; // 05:00–11:59
  if (mins >= 720 && mins < 1020) return 'afternoon'; // 12:00–16:59
  if (mins >= 1020 && mins < 1320) return 'evening'; // 17:00–21:59
  return 'night'; // 22:00–04:59 (includes the after-midnight wrap)
}

/** Sort key so Night reads 22:00 → 23:00 → 00:00 → 04:00. */
function nightKey(time: string): number {
  const mins = toMinutes(time);
  return mins < 300 ? mins + 1440 : mins;
}

/**
 * Group items into ordered, non-empty day-part sections. Within a timed
 * section, sort by time ascending (Night uses the midnight-wrap key). The
 * Anytime section preserves input order and always sorts last.
 */
export function groupHabitsByDayPart<T>(
  items: T[],
  getTime: (item: T) => string | null,
): Array<{ part: DayPart; label: string; items: T[] }> {
  const buckets = new Map<DayPart, T[]>();
  for (const part of DAY_PART_ORDER) buckets.set(part, []);
  for (const item of items) {
    buckets.get(dayPartOf(getTime(item)))!.push(item);
  }

  const sections: Array<{ part: DayPart; label: string; items: T[] }> = [];
  for (const part of DAY_PART_ORDER) {
    const group = buckets.get(part)!;
    if (group.length === 0) continue;
    let ordered = group;
    if (part !== 'anytime') {
      const keyFor = part === 'night' ? nightKey : toMinutes;
      ordered = [...group].sort(
        (a, b) => keyFor(getTime(a)!) - keyFor(getTime(b)!),
      );
    }
    sections.push({ part, label: DAY_PART_LABEL[part], items: ordered });
  }
  return sections;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/lib/domain/__tests__/day-part.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/day-part.ts src/lib/domain/__tests__/day-part.test.ts
git commit -m "feat(habits): day-part bucketing + grouping domain module"
```

---

### Task 2: Migration — add `scheduled_time` column

**Files:**
- Create: `supabase/migrations/019_habits_scheduled_time.sql`

**Interfaces:**
- Produces: `public.habits.scheduled_time TIME` (nullable) in local + live DB.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/019_habits_scheduled_time.sql`:

```sql
-- ============================================
-- HABITS — optional wall-clock time for timer habits.
-- Nullable; existing rows default to NULL ("Anytime"). TIME is zoneless,
-- so bucketing into parts of day is pure string math at read time.
-- ============================================
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;
```

- [ ] **Step 2: Apply to the local database**

Run: `npm run db:reset`
Expected: all migrations apply cleanly, including `019`.

- [ ] **Step 3: Apply to the live database and verify**

Apply via the Supabase MCP `apply_migration` tool (name: `habits_scheduled_time`) with the SQL above, **or** `supabase db push`.

Verify the column exists (Supabase MCP `execute_sql` or psql):

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'scheduled_time';
```

Expected: one row — `scheduled_time | time without time zone`.
(Per project memory: the live DB carries objects not in migrations; introspect, don't assume.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/019_habits_scheduled_time.sql
git commit -m "feat(habits): add scheduled_time column"
```

---

### Task 3: Schema, actions, and Add-habit form

**Files:**
- Modify: `src/lib/schemas/habits.ts`
- Modify: `src/lib/actions/habits.ts`
- Modify: `src/components/habits/AddHabitSheet.tsx`
- Test: `src/lib/schemas/__tests__/habits.test.ts` (create)

**Interfaces:**
- Consumes: `dayPartOf` not needed here.
- Produces:
  - `CreateHabitInput` gains `scheduled_time?: string | null`, loses `emoji`.
  - `createHabit(input)` / `updateHabit(input)` persist `scheduled_time` (timer-gated), no longer write `emoji`.

- [ ] **Step 1: Write the failing schema test**

Create `src/lib/schemas/__tests__/habits.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CreateHabitSchema } from '../habits';

const base = {
  name: 'Focus block',
  goal_id: '00000000-0000-0000-0000-000000000001',
  kind: 'timer' as const,
};

describe('CreateHabitSchema scheduled_time', () => {
  it('accepts a timer habit with a valid HH:MM time', () => {
    const parsed = CreateHabitSchema.parse({ ...base, scheduled_time: '07:30' });
    expect(parsed.scheduled_time).toBe('07:30');
  });

  it('accepts a timer habit with no time', () => {
    const parsed = CreateHabitSchema.parse(base);
    expect(parsed.scheduled_time ?? null).toBeNull();
  });

  it('rejects a non-timer habit that carries a time', () => {
    expect(() =>
      CreateHabitSchema.parse({ ...base, kind: 'check', scheduled_time: '07:30' }),
    ).toThrow();
  });

  it('rejects a malformed time', () => {
    expect(() =>
      CreateHabitSchema.parse({ ...base, scheduled_time: '7:5' }),
    ).toThrow();
  });

  it('no longer accepts an emoji field in the output type', () => {
    const parsed = CreateHabitSchema.parse(base) as Record<string, unknown>;
    expect('emoji' in parsed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/lib/schemas/__tests__/habits.test.ts`
Expected: FAIL — `scheduled_time` not in schema / refine missing.

- [ ] **Step 3: Update the schema**

In `src/lib/schemas/habits.ts`, replace the `CreateHabitSchema` / `UpdateHabitSchema` block (lines 19–34) with:

```ts
export const ScheduledTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour)');

const CreateHabitFields = z.object({
  name: z.string().min(1).max(80),
  goal_id: z.string().uuid(),
  kind: HabitKindSchema,
  target: z.number().positive().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  frequency: FrequencyJsonSchema.default({ type: 'daily' }),
  color: z.string().min(1).max(20).default('gray'),
  scheduled_time: ScheduledTimeSchema.nullable().optional(),
});

export const CreateHabitSchema = CreateHabitFields.refine(
  (d) => d.scheduled_time == null || d.kind === 'timer',
  {
    message: 'Only timer habits can have a scheduled time',
    path: ['scheduled_time'],
  },
);
export type CreateHabitInput = z.infer<typeof CreateHabitSchema>;

export const UpdateHabitSchema = CreateHabitFields.partial().extend({
  id: z.string().uuid(),
});
export type UpdateHabitInput = z.infer<typeof UpdateHabitSchema>;
```

(Note: `emoji` is removed. `UpdateHabitSchema` derives from the un-refined
`CreateHabitFields` so `.partial()` works; timer-gating for updates is enforced
in the action below.)

- [ ] **Step 4: Update the actions**

In `src/lib/actions/habits.ts`:

Add `HabitKind` to the type imports from `@/lib/schemas/habits`:

```ts
  type UpdateHabitInput,
  type HabitKind,
} from '@/lib/schemas/habits';
```

In `createHabit`, replace the `.insert({...})` object (lines 52–62) with (drops `emoji`, adds gated `scheduled_time`):

```ts
    .insert({
      user_id: user.id,
      goal_id: parsed.goal_id,
      name: parsed.name,
      kind: parsed.kind,
      target: parsed.target ?? null,
      unit: parsed.unit ?? null,
      frequency_json: parsed.frequency,
      color: parsed.color,
      scheduled_time:
        parsed.kind === 'timer' ? (parsed.scheduled_time ?? null) : null,
    })
```

In `updateHabit`, remove the emoji patch line (`if (parsed.emoji !== undefined) patch.emoji = parsed.emoji;`) and add a timer-gated `scheduled_time` patch after the `color` line (around line 87):

```ts
  if (parsed.scheduled_time !== undefined) {
    let effectiveKind: HabitKind | undefined = parsed.kind;
    if (effectiveKind === undefined) {
      const { data: current } = await supabase
        .from('habits')
        .select('kind')
        .eq('id', parsed.id)
        .eq('user_id', user.id)
        .single();
      effectiveKind = (current as { kind?: HabitKind } | null)?.kind;
    }
    patch.scheduled_time =
      effectiveKind === 'timer' ? parsed.scheduled_time : null;
  }
```

- [ ] **Step 5: Update the Add-habit form**

In `src/components/habits/AddHabitSheet.tsx`:

Replace the `FormSchema` / `FormValues` block (lines 37–42) with (form treats time as a plain optional string from the native picker; the server re-validates):

```ts
const FormSchema = CreateHabitFields.omit({
  frequency: true,
  scheduled_time: true,
}).extend({
  days: z.array(z.number().int().min(1).max(7)).min(1, 'Pick at least one day'),
  scheduled_time: z.string().optional(),
});
type FormValues = Omit<CreateHabitInput, 'frequency' | 'scheduled_time'> & {
  days: number[];
  scheduled_time?: string;
};
```

Export `CreateHabitFields` so the form can import it — at the top of `src/lib/schemas/habits.ts` change `const CreateHabitFields` to `export const CreateHabitFields` (edit the line written in Step 3). Update the import in `AddHabitSheet.tsx`:

```ts
import {
  CreateHabitFields,
  type CreateHabitInput,
} from '@/lib/schemas/habits';
```

Add `watch` to the `useForm` destructure (line 53):

```ts
  const { register, handleSubmit, control, reset, watch, formState } =
    useForm<FormValues>({
```

In `defaultValues` (lines 56–65), remove `emoji: ''` and add `scheduled_time: ''`. Read the current kind below the destructure:

```ts
  const kind = watch('kind');
```

In `onSubmit` (lines 68–89), replace the `createHabit({...})` argument object's `emoji` line with a gated `scheduled_time`:

```ts
      await createHabit({
        name: values.name,
        goal_id: values.goal_id,
        kind: values.kind,
        target: values.target ?? undefined,
        unit: values.unit || undefined,
        color: values.color || DEFAULT_HABIT_COLOR,
        frequency: frequencyFromDays(values.days),
        scheduled_time:
          values.kind === 'timer' && values.scheduled_time
            ? values.scheduled_time
            : null,
      });
```

Remove the Emoji field. Replace the two-column Emoji/Color grid (lines 222–241) with a single Color field plus a conditional Time field:

```tsx
            {kind === 'timer' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-time">Time</Label>
                <Input
                  id="habit-time"
                  type="time"
                  data-testid="habit-time"
                  {...register('scheduled_time')}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Sorts this habit into a part of your day.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-color">Color</Label>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <ColorPicker
                    id="habit-color"
                    value={field.value || DEFAULT_HABIT_COLOR}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm run test:unit -- src/lib/schemas/__tests__/habits.test.ts && npm run typecheck`
Expected: schema tests PASS; typecheck PASS (no remaining `emoji` references in schema/action/form).

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/habits.ts src/lib/actions/habits.ts src/components/habits/AddHabitSheet.tsx src/lib/schemas/__tests__/habits.test.ts
git commit -m "feat(habits): timer-gated scheduled_time in schema/actions/form; drop emoji field"
```

---

### Task 4: `HabitTimeControl` inline component

**Files:**
- Create: `src/components/habits/HabitTimeControl.tsx`

**Interfaces:**
- Consumes: `updateHabit({ id, scheduled_time })` from `@/lib/actions/habits`; `Popover`/`PopoverTrigger`/`PopoverContent`; `Button`; `Input`.
- Produces: `<HabitTimeControl habitId={string} scheduledTime={string | null} />`.

- [ ] **Step 1: Create the component**

Create `src/components/habits/HabitTimeControl.tsx`:

```tsx
'use client';

import * as React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateHabit } from '@/lib/actions/habits';

/**
 * Inline set / change / clear of a timer habit's scheduled time. Mirrors the
 * ColorPicker popover pattern. Renders only on timer cards.
 */
export function HabitTimeControl({
  habitId,
  scheduledTime,
}: {
  habitId: string;
  scheduledTime: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [time, setTime] = React.useState(scheduledTime ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setTime(scheduledTime ?? '');
  }, [scheduledTime]);

  function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        await updateHabit({ id: habitId, scheduled_time: next });
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update time');
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            data-testid={`habit-time-${habitId}`}
            className="h-auto px-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled hover:text-text-primary"
          >
            ▶ {scheduledTime ?? 'Set time'}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col gap-2">
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            data-testid={`habit-time-input-${habitId}`}
            className="h-9"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              disabled={pending || !time}
              onClick={() => save(time)}
              data-testid={`habit-time-save-${habitId}`}
              className="h-8 px-3 text-xs"
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || !scheduledTime}
              onClick={() => save(null)}
              data-testid={`habit-time-clear-${habitId}`}
              className="h-8 px-3 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/habits/HabitTimeControl.tsx
git commit -m "feat(habits): HabitTimeControl inline time popover"
```

---

### Task 5: Habits page grouping + HabitCard

**Files:**
- Modify: `src/app/(app)/habits/page.tsx`
- Modify: `src/components/habits/HabitCard.tsx`

**Interfaces:**
- Consumes: `groupHabitsByDayPart` (Task 1); `HabitTimeControl` (Task 4); `scheduled_time` column (Task 2).
- Produces: `/habits` rendered in day-part sections; `HabitCard` accepts `scheduledTime`, drops `emoji`.

- [ ] **Step 1: Update HabitCard**

In `src/components/habits/HabitCard.tsx`:

Add the import (after the existing imports near line 5):

```ts
import { HabitTimeControl } from './HabitTimeControl';
```

In `Props.habit` (lines 8–14), remove `emoji: string | null;`. Add a sibling prop to `habit` on `Props` (after the `doneToday: boolean;` line, line 20):

```ts
  scheduledTime: string | null;
```

Update the destructure (lines 37–38):

```ts
export function HabitCard({
  habit,
  currentStreak,
  longestStreak,
  completionRate30d,
  strip,
  dueToday,
  doneToday,
  scheduledTime,
}: Props) {
  const { id, name, kind, frequency } = habit;
```

Replace the header block (lines 48–58) — drop the emoji span, and stack the frequency label with the time control for timer habits:

```tsx
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <h2 className="flex min-w-0 items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          <span className="truncate text-text-primary">{name}</span>
        </h2>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            {frequencyLabel(frequency)}
          </span>
          {kind === 'timer' && (
            <HabitTimeControl habitId={id} scheduledTime={scheduledTime} />
          )}
        </div>
      </header>
```

- [ ] **Step 2: Update the habits page query + type**

In `src/app/(app)/habits/page.tsx`:

In `HabitRecord` (lines 19–29), remove `emoji: string | null;` and add `scheduled_time: string | null;`.

In the habits `.select(...)` (line 56), drop `emoji`, add `scheduled_time`:

```ts
      .select('id, name, kind, color, frequency_json, scheduled_time, archived_at, is_active, created_at')
```

- [ ] **Step 3: Group and render sections**

In `src/app/(app)/habits/page.tsx`, add the import near the other domain imports (after line 10):

```ts
import { groupHabitsByDayPart } from '@/lib/domain/day-part';
```

After the `cards` array is built (after line 96), add:

```ts
  const sections = groupHabitsByDayPart(cards, (c) => c.habit.scheduled_time);
```

Replace the habits list `<div ...>` block (lines 141–163, the `data-testid="habits-list"` columns div and its `cards.map`) with grouped sections:

```tsx
          <div data-testid="habits-list" className="space-y-8">
            {sections.map((section) => (
              <section
                key={section.part}
                data-testid={`habits-section-${section.part}`}
              >
                <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
                  {section.label}
                  <span className="text-text-secondary"> · {section.items.length}</span>
                </h2>
                <div className="columns-1 gap-4 md:columns-2 2xl:columns-3">
                  {section.items.map((c) => (
                    <HabitCard
                      key={c.habit.id}
                      habit={{
                        id: c.habit.id,
                        name: c.habit.name,
                        kind: c.habit.kind,
                        frequency: c.habit.frequency_json,
                      }}
                      scheduledTime={c.habit.scheduled_time}
                      currentStreak={c.streak.currentStreak}
                      longestStreak={c.streak.longestStreak}
                      completionRate30d={c.streak.completionRate30d}
                      strip={c.strip}
                      dueToday={c.dueToday}
                      doneToday={c.doneToday}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
```

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS — no `emoji` references remain in `habits/page.tsx` or `HabitCard.tsx`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/habits/page.tsx" src/components/habits/HabitCard.tsx
git commit -m "feat(habits): group habits page by part of day; wire scheduled_time onto cards"
```

---

### Task 6: Remove emoji from remaining habit consumers

**Files:**
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/components/today/HabitsDueWidget.tsx`
- Modify: `src/app/(app)/plans/page.tsx`
- Modify: `src/components/plans/WeekList.tsx`
- Modify: `src/components/plans/MonthGrid.tsx`

**Interfaces:**
- Produces: zero remaining reads of `habits.emoji` anywhere in live code.

- [ ] **Step 1: Today page**

In `src/app/(app)/today/page.tsx`:
- Line 46 select: drop `emoji` → `.select('id, name, kind, frequency_json')`.
- In the `habits` local type (lines 86–92), remove `emoji: string | null;`.

- [ ] **Step 2: HabitsDueWidget**

In `src/components/today/HabitsDueWidget.tsx`:
- In the `Habit` type (lines 6–12), remove `emoji: string | null;`.
- Remove the emoji span (lines 53–55) so the list item is just the name:

```tsx
                <div className="flex min-w-0 items-center gap-3">
                  <span className="truncate font-sans text-[14px] text-text-primary">
                    {h.name}
                  </span>
```

- [ ] **Step 3: Plans page**

In `src/app/(app)/plans/page.tsx`:
- Line 74 select: drop `emoji` → `.select('id, name, color, frequency_json')`.
- In the `habits` local type (lines 97–103), remove `emoji: string | null;`.
- In `habitsForGrid` (lines 109–114), remove the `emoji: h.emoji,` line.
- In the `dueHabits` map (lines 156–163), remove the `emoji: h.emoji,` line.

- [ ] **Step 4: WeekList**

In `src/components/plans/WeekList.tsx`:
- In `HabitDayItem` (lines 15–20), remove `emoji: string | null;`.
- Line 120: replace with the logged/due marker only:

```tsx
                    <span aria-hidden>{h.logged ? '✓' : '○'}</span>
```

- [ ] **Step 5: MonthGrid**

In `src/components/plans/MonthGrid.tsx`:
- In `HabitLite` (lines 15–20), remove `emoji: string | null;`.
- Line 128: replace `{h.emoji ?? '✓'}` with:

```tsx
                      ✓
```

- [ ] **Step 6: Verify no emoji reads remain on habits**

Run: `grep -rn "\.emoji\|emoji:" src/app/\(app\)/habits src/app/\(app\)/today src/app/\(app\)/plans src/components/habits src/components/today src/components/plans`
Expected: no matches referencing habit emoji (the expense-category and dead-dashboard files are out of scope and not in these paths).

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/today/page.tsx" src/components/today/HabitsDueWidget.tsx "src/app/(app)/plans/page.tsx" src/components/plans/WeekList.tsx src/components/plans/MonthGrid.tsx
git commit -m "refactor(habits): remove emoji from today/plans habit consumers"
```

---

### Task 7: Migration — drop `emoji` column

**Files:**
- Create: `supabase/migrations/020_habits_drop_emoji.sql`

**Interfaces:**
- Produces: `public.habits.emoji` removed from local + live DB. Safe now — Tasks 3–6 removed every reader/writer.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/020_habits_drop_emoji.sql`:

```sql
-- ============================================
-- HABITS — remove the emoji concept. All live readers/writers were removed
-- in the same change set. The legacy (unrouted) JarvisDashboard subsystem is
-- dead code and does not run, so dropping the column is safe.
-- ============================================
ALTER TABLE public.habits
  DROP COLUMN IF EXISTS emoji;
```

- [ ] **Step 2: Apply to the local database**

Run: `npm run db:reset`
Expected: clean apply through `020`.

- [ ] **Step 3: Apply to the live database and verify**

Apply via the Supabase MCP `apply_migration` (name: `habits_drop_emoji`) or `supabase db push`. Verify the column is gone:

```sql
SELECT count(*) AS still_present
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'emoji';
```

Expected: `still_present = 0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/020_habits_drop_emoji.sql
git commit -m "feat(habits): drop emoji column"
```

---

### Task 8: Full verification + e2e/test sweep

**Files:**
- Modify (if the sweep finds breakage): existing e2e specs under `e2e/` and any habit unit tests.

- [ ] **Step 1: Find e2e specs that reference removed surfaces**

Run: `grep -rn "habit-emoji\|\.emoji\|habits-list\|habit-time" e2e 2>/dev/null; ls e2e 2>/dev/null`
Expected: a list (possibly empty). For each hit: tests asserting on an emoji input (`habit-emoji`) must be updated/removed; tests asserting the old flat `habits-list` structure may need to target a section (`habits-section-*`) instead.

- [ ] **Step 2: Apply any needed test edits**

Update the specs the sweep surfaced so they match the new form (no emoji field) and grouped list. (No code block — content depends on what exists; keep selectors aligned with the `data-testid`s introduced: `habit-time`, `habits-section-<part>`, `habit-time-<id>`, `habit-time-save-<id>`, `habit-time-clear-<id>`.)

- [ ] **Step 3: Run the full unit suite, typecheck, lint, build**

Run: `npm run test:unit && npm run typecheck && npm run lint && npm run build`
Expected: all green. The build must not error on the dropped column (verified: no live reader remains).

- [ ] **Step 4: Manual smoke (dev server)**

Run: `npm run dev`, then:
- Add a **timer** habit with time `07:30` → it appears under **MORNING** on `/habits`.
- Add a **check** habit → it appears under **ANYTIME**.
- On a timer card, click `▶ <time>` → change the time → card moves to the new section; **Clear** → moves to ANYTIME.
- `/today` and `/plans` render with no emoji and no errors.

- [ ] **Step 5: Commit any test fixes**

```bash
git add -A
git commit -m "test(habits): align specs with scheduled_time + emoji removal"
```

---

## Self-Review

**Spec coverage:**
- Migration add `scheduled_time` + drop `emoji` → Tasks 2 & 7 (split for safe sequencing; both operations covered).
- Day-part buckets/boundaries/wrap → Task 1 (`dayPartOf`, `groupHabitsByDayPart`, tests).
- Timer-gating (schema refine + action defense) → Task 3.
- Schema/action `scheduled_time` + emoji removal → Task 3.
- Add form conditional Time field + emoji removal → Task 3.
- Habits page grouping + card wiring + emoji removal → Task 5.
- `HabitTimeControl` popover (set/change/clear) → Task 4.
- Emoji blast-radius (today, plans, WeekList, MonthGrid, HabitsDueWidget) → Task 6.
- Out-of-scope dead dashboard / expense icons → untouched (not referenced by any task).
- Verification gates → Task 8.

**Placeholder scan:** No TBD/TODO. The only non-code step is Task 8 Step 2 (e2e edits), which is inherently conditional on what specs exist; selectors to use are listed explicitly.

**Type consistency:** `scheduled_time` (DB/schema/action snake_case) vs `scheduledTime` (component prop camelCase) used consistently — page maps `c.habit.scheduled_time` → `scheduledTime` prop, mirroring the existing `frequency_json` → `frequency` convention. `HabitKind`, `CreateHabitFields`, `CreateHabitInput`, `groupHabitsByDayPart(items, getTime)` signatures match across tasks.
