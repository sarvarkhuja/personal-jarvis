# Per-Weekday Habit Times Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a timer habit hold a different scheduled time for each weekday it is due, replacing the single `scheduled_time` with a per-weekday map.

**Architecture:** A new JSONB column `scheduled_times_json` (ISO-weekday → `"HH:MM"`) replaces `scheduled_time`. Pure helpers (`earliestTime`, `timesAreUniform`, `dueWeekdays`) drive grouping and validation. The `/habits` page groups by earliest time of week; the Add form and an inline card popover both edit a per-day grid. Timer-only; `daily`/`weekly` only.

**Tech Stack:** Next.js 16 (Server Components, Server Actions), React 19, TypeScript, Zod 4, react-hook-form, base-ui Popover, Supabase (Postgres + RLS), Vitest.

## Global Constraints

- **WORK IN PLACE — NO COMMITS, NO BRANCH.** Stay on `main`; do NOT `git add`, `git commit`, `git checkout -b`, or branch. Leave ALL changes uncommitted in the working tree for the user to review/commit. Each task ENDS at verification (tests/typecheck), NOT a commit. (The working tree also holds the user's unrelated, uncommitted "home-dashboard" work — never touch, stage, or revert it.)
- **Review isolation:** per-task diffs come from `git diff -- <task's tracked paths>` (the feature's files start clean at `main` HEAD) and reading any new untracked files directly. There are no commit ranges.
- **This supersedes the single-time feature** shipped earlier today. `scheduled_time` is replaced everywhere by `scheduled_times_json`; the column is dropped (it is empty in production).
- **Data shape:** `scheduled_times_json` is `{ "<isoWeekday>": "HH:MM" }`, keys `"1"`=Mon … `"7"`=Sun, values `"HH:MM"` 24h. Absent weekday = no time that day. Keys are always ⊆ the habit's due days. JSONB stores `"HH:MM"` verbatim (no Postgres `TIME` → `"HH:MM:SS"` issue).
- **Timer-only; daily/weekly only.** Only `kind = 'timer'` habits get times. `x_per_week` habits get none (`dueWeekdays` returns `[]`).
- **Grouping** on `/habits` is by `earliestTime(map)` → day-part. No times → Anytime.
- **Baseline (establish at Task 1 start):** run `npm run test:run`, `npm run typecheck`, `npm run lint` once and record the result. The tree contains the user's uncommitted home-dashboard work (incl. untracked `home-overview.test.ts`, `habit-logs.test.ts`) — those and the pre-existing `theme-toggle.tsx` lint error are OUT OF SCOPE. Your bar: the feature's own tests pass, typecheck stays clean, and you introduce NO new lint problems in feature files. Do not fix home-dashboard files.
- **Live migration** (Task 7) is applied to the live PersonalJarvis DB by the CONTROLLER with explicit user authorization — never by an implementer subagent.
- **Next.js is non-standard here** (see `AGENTS.md`): consult `node_modules/next/dist/docs/` before using any Next API; follow existing repo patterns.

---

### Task 1: Domain helpers — times + due-weekdays

**Files:**
- Modify: `src/lib/domain/day-part.ts`
- Modify: `src/lib/domain/habit-frequency.ts`
- Test: `src/lib/domain/__tests__/day-part.test.ts` (extend)
- Test: `src/lib/domain/__tests__/habit-frequency.test.ts` (create)

**Interfaces:**
- Produces:
  - `type ScheduledTimes = Record<string, string>` (day-part.ts)
  - `earliestTime(times: ScheduledTimes | null | undefined): string | null`
  - `timesAreUniform(times: ScheduledTimes | null | undefined): boolean`
  - `dueWeekdays(frequency: FrequencyJson): number[]` (habit-frequency.ts)
  - `WEEKDAY_LABELS: Record<number, string>` (habit-frequency.ts)

- [ ] **Step 1: Establish baseline**

Run: `npm run test:run 2>&1 | tail -3 ; npm run typecheck ; echo "tc:$?"`
Record the pass count and that typecheck is clean. (Home-dashboard's untracked tests may be present; note their state but do not modify them.)

- [ ] **Step 2: Write the failing tests**

Append to `src/lib/domain/__tests__/day-part.test.ts`:

```ts
import { earliestTime, timesAreUniform } from '../day-part';

describe('earliestTime', () => {
  it('returns the smallest HH:MM among values', () => {
    expect(earliestTime({ '1': '07:00', '6': '09:30' })).toBe('07:00');
    expect(earliestTime({ '3': '21:00' })).toBe('21:00');
  });
  it('returns null for empty or nullish maps', () => {
    expect(earliestTime({})).toBeNull();
    expect(earliestTime(null)).toBeNull();
    expect(earliestTime(undefined)).toBeNull();
  });
});

describe('timesAreUniform', () => {
  it('is true when every value is identical (non-empty)', () => {
    expect(timesAreUniform({ '1': '07:00', '3': '07:00' })).toBe(true);
  });
  it('is false for varied, empty, or nullish maps', () => {
    expect(timesAreUniform({ '1': '07:00', '6': '09:30' })).toBe(false);
    expect(timesAreUniform({})).toBe(false);
    expect(timesAreUniform(null)).toBe(false);
  });
});
```

Create `src/lib/domain/__tests__/habit-frequency.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dueWeekdays, WEEKDAY_LABELS } from '../habit-frequency';

describe('dueWeekdays', () => {
  it('daily → all 7', () => {
    expect(dueWeekdays({ type: 'daily' })).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('weekly → its days, sorted', () => {
    expect(dueWeekdays({ type: 'weekly', days: [6, 1, 3] })).toEqual([1, 3, 6]);
  });
  it('x_per_week → none', () => {
    expect(dueWeekdays({ type: 'x_per_week', count: 3 })).toEqual([]);
  });
});

describe('WEEKDAY_LABELS', () => {
  it('maps ISO weekdays to short labels', () => {
    expect(WEEKDAY_LABELS[1]).toBe('Mon');
    expect(WEEKDAY_LABELS[7]).toBe('Sun');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:unit -- src/lib/domain/__tests__/day-part.test.ts src/lib/domain/__tests__/habit-frequency.test.ts`
Expected: FAIL — `earliestTime`/`timesAreUniform`/`dueWeekdays`/`WEEKDAY_LABELS` not exported.

- [ ] **Step 4: Implement in `day-part.ts`**

Add near the top of `src/lib/domain/day-part.ts` (after the existing `hhmm` export is fine):

```ts
/** Per-weekday scheduled times: ISO weekday "1".."7" -> "HH:MM". */
export type ScheduledTimes = Record<string, string>;

/** Smallest "HH:MM" among the map's values, or null if empty/nullish.
 *  "HH:MM" is zero-padded, so lexicographic min == chronological min. */
export function earliestTime(
  times: ScheduledTimes | null | undefined,
): string | null {
  if (!times) return null;
  const values = Object.values(times);
  if (values.length === 0) return null;
  return values.reduce((min, t) => (t < min ? t : min));
}

/** True when the map is non-empty and every value is identical. */
export function timesAreUniform(
  times: ScheduledTimes | null | undefined,
): boolean {
  if (!times) return false;
  const values = Object.values(times);
  if (values.length === 0) return false;
  return values.every((t) => t === values[0]);
}
```

- [ ] **Step 5: Implement in `habit-frequency.ts`**

In `src/lib/domain/habit-frequency.ts`, add after the existing `ALL_DAYS` constant:

```ts
/** Short ISO-weekday labels, Monday(1) … Sunday(7). */
export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};
```

And add at the end of the file:

```ts
/**
 * The weekdays (ISO 1–7) a habit is due, for per-weekday scheduling.
 * daily → all 7; weekly → its days (sorted); x_per_week → none (no fixed days).
 */
export function dueWeekdays(frequency: FrequencyJson): number[] {
  if (frequency.type === 'daily') return [...ALL_DAYS];
  if (frequency.type === 'weekly')
    return [...frequency.days].sort((a, b) => a - b);
  return [];
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test:unit -- src/lib/domain/__tests__/day-part.test.ts src/lib/domain/__tests__/habit-frequency.test.ts`
Expected: PASS (all new cases). Then `npm run typecheck` → clean.

- [ ] **Step 7: Leave uncommitted**

Do NOT commit. Verify your changed paths with `git diff --stat -- src/lib/domain/day-part.ts src/lib/domain/habit-frequency.ts` and that the two test files exist (one untracked). Report the diff.

---

### Task 2: Schema — `scheduled_times` map + validation

**Files:**
- Modify: `src/lib/schemas/habits.ts`
- Test: `src/lib/schemas/__tests__/habits.test.ts` (replace the scheduled_time cases)

**Interfaces:**
- Consumes: `dueWeekdays` (Task 1).
- Produces: `ScheduledTimesSchema`; `CreateHabitFields` gains `scheduled_times?: ScheduledTimes | null` (loses `scheduled_time`); `CreateHabitSchema` rejects non-timer-with-times and keys outside due days.

- [ ] **Step 1: Write the failing tests**

Replace the body of `src/lib/schemas/__tests__/habits.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { CreateHabitSchema, UpdateHabitSchema } from '../habits';

const base = {
  name: 'Focus block',
  goal_id: '123e4567-e89b-12d3-a456-426614174000',
  kind: 'timer' as const,
};

describe('CreateHabitSchema scheduled_times', () => {
  it('accepts a timer daily habit with per-weekday times', () => {
    const parsed = CreateHabitSchema.parse({
      ...base,
      frequency: { type: 'daily' },
      scheduled_times: { '1': '07:00', '6': '09:30' },
    });
    expect(parsed.scheduled_times).toEqual({ '1': '07:00', '6': '09:30' });
  });

  it('accepts a timer habit with no times', () => {
    const parsed = CreateHabitSchema.parse(base);
    expect(parsed.scheduled_times ?? null).toBeNull();
  });

  it('rejects a non-timer habit that carries times', () => {
    const r = CreateHabitSchema.safeParse({
      ...base,
      kind: 'check',
      scheduled_times: { '1': '07:00' },
    });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues.some((i) => i.path[0] === 'scheduled_times')).toBe(true);
  });

  it('rejects a time on a day the habit is not due (weekly)', () => {
    const r = CreateHabitSchema.safeParse({
      ...base,
      frequency: { type: 'weekly', days: [1, 3] },
      scheduled_times: { '6': '09:30' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects any times on an x_per_week habit', () => {
    const r = CreateHabitSchema.safeParse({
      ...base,
      frequency: { type: 'x_per_week', count: 3 },
      scheduled_times: { '1': '07:00' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects a malformed time value', () => {
    const r = CreateHabitSchema.safeParse({ ...base, scheduled_times: { '1': '7:5' } });
    expect(r.success).toBe(false);
  });

  it('UpdateHabitSchema accepts a partial with only id + scheduled_times', () => {
    const parsed = UpdateHabitSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      scheduled_times: { '1': '09:00' },
    });
    expect(parsed.scheduled_times).toEqual({ '1': '09:00' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:unit -- src/lib/schemas/__tests__/habits.test.ts`
Expected: FAIL — `scheduled_times` not in schema.

- [ ] **Step 3: Implement the schema**

In `src/lib/schemas/habits.ts`:

Add an import at the top (after the `import { z }` line):

```ts
import { dueWeekdays } from '@/lib/domain/habit-frequency';
```

Replace the `ScheduledTimeSchema` + `CreateHabitFields` + `CreateHabitSchema` block (current lines 19–40) with:

```ts
export const ScheduledTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour)');

export const WeekdayKeySchema = z.enum(['1', '2', '3', '4', '5', '6', '7']);
export const ScheduledTimesSchema = z.record(WeekdayKeySchema, ScheduledTimeSchema);

export const CreateHabitFields = z.object({
  name: z.string().min(1).max(80),
  goal_id: z.string().uuid(),
  kind: HabitKindSchema,
  target: z.number().positive().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  frequency: FrequencyJsonSchema.default({ type: 'daily' }),
  color: z.string().min(1).max(20).default('gray'),
  scheduled_times: ScheduledTimesSchema.nullable().optional(),
});

export const CreateHabitSchema = CreateHabitFields.superRefine((d, ctx) => {
  const times = d.scheduled_times;
  if (times == null || Object.keys(times).length === 0) return;
  if (d.kind !== 'timer') {
    ctx.addIssue({
      code: 'custom',
      path: ['scheduled_times'],
      message: 'Only timer habits can have scheduled times',
    });
  }
  const due = new Set(dueWeekdays(d.frequency).map(String));
  for (const key of Object.keys(times)) {
    if (!due.has(key)) {
      ctx.addIssue({
        code: 'custom',
        path: ['scheduled_times'],
        message: 'Time set for a day the habit is not due',
      });
    }
  }
});
```

(The `CreateHabitInput` / `UpdateHabitSchema` lines below stay as-is — they already derive from `CreateHabitFields`.)

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:unit -- src/lib/schemas/__tests__/habits.test.ts`
Expected: PASS (7 cases). Then `npm run typecheck` → clean.

Note: `schemas/habits.ts` imports `dueWeekdays` from `habit-frequency.ts`, which type-only-imports `FrequencyJson` back — type-only imports are erased, so there is no runtime cycle.

- [ ] **Step 5: Leave uncommitted**

Do NOT commit. Report `git diff -- src/lib/schemas/habits.ts` and the test file changes.

---

### Task 3: Actions — persist `scheduled_times_json`

**Files:**
- Modify: `src/lib/actions/habits.ts`

**Interfaces:**
- Consumes: `dueWeekdays` (Task 1); `CreateHabitInput`/`UpdateHabitInput` with `scheduled_times` (Task 2).
- Produces: `createHabit`/`updateHabit` write the `scheduled_times_json` column (timer + due-day gated).

- [ ] **Step 1: Add imports**

In `src/lib/actions/habits.ts`, add to the type imports from `@/lib/schemas/habits` a value/type import for `FrequencyJson`, and import `dueWeekdays`:

```ts
import { dueWeekdays } from '@/lib/domain/habit-frequency';
import type { FrequencyJson } from '@/lib/schemas/habits';
```

(`HabitKind` is already imported.)

- [ ] **Step 2: Update `createHabit` insert**

In `createHabit`, replace the `scheduled_time:` line in the `.insert({...})` object (current lines 62–63) with:

```ts
      scheduled_times_json:
        parsed.kind === 'timer' ? (parsed.scheduled_times ?? null) : null,
```

- [ ] **Step 3: Update `updateHabit` patch**

In `updateHabit`, replace the entire `if (parsed.scheduled_time !== undefined) { ... }` block (current lines 91–104) with:

```ts
  if (parsed.scheduled_times !== undefined) {
    let effectiveKind: HabitKind | undefined = parsed.kind;
    let effectiveFreq: FrequencyJson | undefined = parsed.frequency;
    if (effectiveKind === undefined || effectiveFreq === undefined) {
      const { data: current } = await supabase
        .from('habits')
        .select('kind, frequency_json')
        .eq('id', parsed.id)
        .eq('user_id', user.id)
        .single();
      effectiveKind =
        effectiveKind ?? (current as { kind?: HabitKind } | null)?.kind;
      effectiveFreq =
        effectiveFreq ??
        (current as { frequency_json?: FrequencyJson } | null)?.frequency_json;
    }
    if (effectiveKind !== 'timer' || parsed.scheduled_times == null) {
      patch.scheduled_times_json = null;
    } else {
      const due = new Set(
        dueWeekdays(effectiveFreq ?? { type: 'daily' }).map(String),
      );
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.scheduled_times)) {
        if (due.has(k)) filtered[k] = v;
      }
      patch.scheduled_times_json =
        Object.keys(filtered).length > 0 ? filtered : null;
    }
  }
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: clean (no `scheduled_time` references remain in this file; `grep -n scheduled_time src/lib/actions/habits.ts` should show only `scheduled_times`/`scheduled_times_json`).

- [ ] **Step 5: Leave uncommitted**

Do NOT commit. Report `git diff -- src/lib/actions/habits.ts`.

---

### Task 4: `HabitTimeControl` — per-weekday editor

**Files:**
- Modify (rewrite): `src/components/habits/HabitTimeControl.tsx`

**Interfaces:**
- Consumes: `updateHabit({ id, scheduled_times })`; `earliestTime`, `timesAreUniform`, `ScheduledTimes` (Task 1); `WEEKDAY_LABELS` (Task 1).
- Produces: `<HabitTimeControl habitId={string} scheduledTimes={ScheduledTimes | null} dueWeekdays={number[]} />`.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/habits/HabitTimeControl.tsx` with:

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
import {
  earliestTime,
  timesAreUniform,
  type ScheduledTimes,
} from '@/lib/domain/day-part';
import { WEEKDAY_LABELS } from '@/lib/domain/habit-frequency';

/** At-a-glance trigger label for the current times. */
function summary(times: ScheduledTimes | null): string {
  if (!times || Object.keys(times).length === 0) return 'Set times';
  if (timesAreUniform(times)) return earliestTime(times)!;
  return `${earliestTime(times)} ·varies`;
}

/**
 * Inline per-weekday time editor for a timer habit. One time input per due
 * weekday; Save persists the whole map, Clear all wipes it. Mirrors the
 * ColorPicker popover pattern; state is seeded in the open handler (not a
 * useEffect) to avoid react-hooks/set-state-in-effect.
 */
export function HabitTimeControl({
  habitId,
  scheduledTimes,
  dueWeekdays,
}: {
  habitId: string;
  scheduledTimes: ScheduledTimes | null;
  dueWeekdays: number[];
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<number, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function seed(): Record<number, string> {
    const d: Record<number, string> = {};
    for (const wd of dueWeekdays) d[wd] = scheduledTimes?.[String(wd)] ?? '';
    return d;
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(seed());
      setError(null);
    }
    setOpen(next);
  }

  function persist(payload: ScheduledTimes | null) {
    setError(null);
    startTransition(async () => {
      try {
        await updateHabit({ id: habitId, scheduled_times: payload });
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update times');
      }
    });
  }

  function save() {
    const map: ScheduledTimes = {};
    for (const wd of dueWeekdays) {
      const v = draft[wd];
      if (v) map[String(wd)] = v;
    }
    persist(Object.keys(map).length > 0 ? map : null);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            data-testid={`habit-time-${habitId}`}
            className="h-auto px-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled hover:text-text-primary"
          >
            ▶ {summary(scheduledTimes)}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col gap-2">
          {dueWeekdays.map((wd) => (
            <div key={wd} className="flex items-center gap-2">
              <span className="w-9 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                {WEEKDAY_LABELS[wd]}
              </span>
              <Input
                type="time"
                value={draft[wd] ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [wd]: e.target.value }))
                }
                data-testid={`habit-time-input-${habitId}-${wd}`}
                className="h-9"
              />
            </div>
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              disabled={pending}
              onClick={save}
              data-testid={`habit-time-save-${habitId}`}
              className="h-8 px-3 text-xs"
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || !scheduledTimes}
              onClick={() => persist(null)}
              data-testid={`habit-time-clear-${habitId}`}
              className="h-8 px-3 text-xs"
            >
              Clear all
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck` → clean. `npm run lint` → no new problems referencing `HabitTimeControl.tsx` (the pre-existing `theme-toggle.tsx` error is out of scope).

- [ ] **Step 3: Leave uncommitted**

Do NOT commit. Report `git diff -- src/components/habits/HabitTimeControl.tsx`.

---

### Task 5: `AddHabitSheet` — per-weekday editor at create

**Files:**
- Modify: `src/components/habits/AddHabitSheet.tsx`

**Interfaces:**
- Consumes: `WEEKDAY_LABELS` (Task 1); `createHabit({ ..., scheduled_times })` (Task 3).

- [ ] **Step 1: Swap the form's time field type**

In `src/components/habits/AddHabitSheet.tsx`:

Add the import (with the other domain import on line 12):

```ts
import { ALL_DAYS, frequencyFromDays, WEEKDAY_LABELS } from '@/lib/domain/habit-frequency';
```

Replace the `FormSchema` / `FormValues` block (current lines 37–47) with:

```ts
const FormSchema = CreateHabitFields.omit({
  frequency: true,
  scheduled_times: true,
}).extend({
  days: z.array(z.number().int().min(1).max(7)).min(1, 'Pick at least one day'),
  scheduled_times: z.record(z.string(), z.string()).optional(),
});
type FormValues = Omit<CreateHabitInput, 'frequency' | 'scheduled_times'> & {
  days: number[];
  scheduled_times?: Record<string, string>;
};
```

In `defaultValues` (current lines 61–70), replace `scheduled_time: '',` with `scheduled_times: {},`.

Add a watch for the selected days, right after `const kind = watch('kind');` (line 73):

```ts
  const days = watch('days');
```

- [ ] **Step 2: Update submit + kind-change clearing**

In `onSubmit`, replace the `scheduled_time:` argument to `createHabit` (current lines 87–90) with a built map:

```ts
        scheduled_times:
          values.kind === 'timer'
            ? (() => {
                const map: Record<string, string> = {};
                for (const wd of values.days) {
                  const v = values.scheduled_times?.[String(wd)];
                  if (v) map[String(wd)] = v;
                }
                return Object.keys(map).length > 0 ? map : null;
              })()
            : null,
```

In the `kind` select's `onChange` (current lines 197–202), replace `setValue('scheduled_time', '');` with `setValue('scheduled_times', {});`.

- [ ] **Step 3: Replace the time field with a per-day editor**

Replace the entire `{kind === 'timer' && ( ... )}` Time block (current lines 237–250) with:

```tsx
            {kind === 'timer' && (
              <div className="flex flex-col gap-1.5">
                <Label>Times per day</Label>
                <Controller
                  name="scheduled_times"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-2" data-testid="habit-times">
                      {days.map((wd) => (
                        <div key={wd} className="flex items-center gap-2">
                          <span className="w-9 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                            {WEEKDAY_LABELS[wd]}
                          </span>
                          <Input
                            type="time"
                            data-testid={`habit-time-${wd}`}
                            value={field.value?.[String(wd)] ?? ''}
                            onChange={(e) =>
                              field.onChange({
                                ...(field.value ?? {}),
                                [String(wd)]: e.target.value,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Each day can have its own time.
                </p>
              </div>
            )}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → clean. `npm run lint` → no new problems for `AddHabitSheet.tsx`. `grep -n scheduled_time src/components/habits/AddHabitSheet.tsx` shows only `scheduled_times`.

- [ ] **Step 5: Leave uncommitted**

Do NOT commit. Report `git diff -- src/components/habits/AddHabitSheet.tsx`.

---

### Task 6: `HabitCard` + `/habits` page — display + grouping

**Files:**
- Modify: `src/components/habits/HabitCard.tsx`
- Modify: `src/app/(app)/habits/page.tsx`

**Interfaces:**
- Consumes: `earliestTime`, `ScheduledTimes` (Task 1); `dueWeekdays`, `WEEKDAY_LABELS` (Task 1); `<HabitTimeControl ... dueWeekdays scheduledTimes />` (Task 4).

- [ ] **Step 1: Update `HabitCard`**

In `src/components/habits/HabitCard.tsx`:

Replace the import block's `HabitTimeControl` import area (lines 1–6) by adding two domain imports:

```ts
import { dueWeekdays, WEEKDAY_LABELS } from '@/lib/domain/habit-frequency';
import type { ScheduledTimes } from '@/lib/domain/day-part';
```

In `Props`, replace `scheduledTime: string | null;` (line 21) with:

```ts
  scheduledTimes: ScheduledTimes | null;
```

In the destructure (line 38) replace `scheduledTime,` with `scheduledTimes,`. After `const { id, name, kind, frequency } = habit;` (line 40) add:

```ts
  const dueDays = dueWeekdays(frequency);
  const scheduleParts = dueDays
    .filter((wd) => scheduledTimes?.[String(wd)])
    .map((wd) => `${WEEKDAY_LABELS[wd].toUpperCase()} ${scheduledTimes![String(wd)]}`);
```

Replace the header's time-control block (current lines 54–61) with — render the control only for timer habits that have due weekdays, plus a compact schedule line:

```tsx
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            {frequencyLabel(frequency)}
          </span>
          {kind === 'timer' && dueDays.length > 0 && (
            <HabitTimeControl
              habitId={id}
              scheduledTimes={scheduledTimes}
              dueWeekdays={dueDays}
            />
          )}
        </div>
```

Add a compact schedule line just below the `</header>` close (after current line 62), before the `{/* primary ... */}` block:

```tsx
      {scheduleParts.length > 0 && (
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
          {scheduleParts.join(' · ')}
        </div>
      )}
```

- [ ] **Step 2: Update `/habits` page**

In `src/app/(app)/habits/page.tsx`:

Replace the day-part import (line 12) with one that also brings `earliestTime` + the type:

```ts
import { groupHabitsByDayPart, earliestTime, type ScheduledTimes } from '@/lib/domain/day-part';
```

In `HabitRecord` (lines 20–30), replace `scheduled_time: string | null;` with:

```ts
  scheduled_times_json: ScheduledTimes | null;
```

In the habits `.select(...)` (line 57) replace `scheduled_time` with `scheduled_times_json`:

```ts
      .select('id, name, kind, color, frequency_json, scheduled_times_json, archived_at, is_active, created_at')
```

Replace the grouping line (line 99):

```ts
  const sections = groupHabitsByDayPart(cards, (c) =>
    earliestTime(c.habit.scheduled_times_json),
  );
```

In the `<HabitCard ... />` props (line 164) replace `scheduledTime={c.habit.scheduled_time}` with:

```tsx
                      scheduledTimes={c.habit.scheduled_times_json}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` → clean. `npm run lint` → no new problems for these two files. Confirm `grep -rn "scheduled_time\b" "src/app/(app)/habits/page.tsx" src/components/habits/HabitCard.tsx` shows no bare `scheduled_time` (only `scheduled_times`/`scheduled_times_json`).

- [ ] **Step 4: Leave uncommitted**

Do NOT commit. Report `git diff -- "src/app/(app)/habits/page.tsx" src/components/habits/HabitCard.tsx`.

---

### Task 7: Migration `021` — add map, drop single column

**Files:**
- Create: `supabase/migrations/021_habits_per_weekday_times.sql`

**Interfaces:**
- Produces: `habits.scheduled_times_json JSONB` (nullable); `habits.scheduled_time` removed.

- [ ] **Step 1: Create the migration file (implementer)**

Create `supabase/migrations/021_habits_per_weekday_times.sql`:

```sql
-- ============================================
-- HABITS — per-weekday scheduled times. Replaces the single scheduled_time
-- (timer-only, all-NULL in production) with a JSONB map keyed by ISO weekday
-- ("1"=Mon … "7"=Sun) -> "HH:MM". JSONB stores HH:MM verbatim (no TIME
-- "HH:MM:SS" serialization). All code readers are updated in the same change.
-- ============================================
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS scheduled_times_json JSONB;

ALTER TABLE public.habits
  DROP COLUMN IF EXISTS scheduled_time;
```

Do NOT apply it. Do NOT run `npm run db:reset`. Do NOT commit. Report the file path + contents.

- [ ] **Step 2: Controller applies to live (NOT an implementer)**

The controller, with explicit user authorization, pre-flights and applies:
- Pre-flight: confirm `scheduled_time` is all-NULL — `SELECT count(*) AS with_time FROM public.habits WHERE scheduled_time IS NOT NULL;` (expect 0; if >0, surface to the user before dropping).
- Apply via Supabase MCP `apply_migration` (project `itgbncsosbkoydemgknz`, name `habits_per_weekday_times`) with the SQL above.
- Verify: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='habits' AND column_name IN ('scheduled_time','scheduled_times_json');` → expect one row, `scheduled_times_json | jsonb`, and `scheduled_time` absent.

---

### Task 8: Full verification + manual smoke

**Files:** none (verification), unless e2e specs need alignment.

- [ ] **Step 1: e2e sweep**

Run: `grep -rn "scheduled_time\|habit-time\|habits-section" tests/e2e 2>/dev/null; ls tests/e2e 2>/dev/null`
Update any spec that referenced the old single-time field. New testids: `habit-times` (Add form group), `habit-time-<wd>` (Add form per-day input), `habit-time-<id>` (card trigger), `habit-time-input-<id>-<wd>`, `habit-time-save-<id>`, `habit-time-clear-<id>`. If nothing references removed surfaces, note it and skip. Do NOT commit.

- [ ] **Step 2: Full automated gate (run each separately — lint exits non-zero on the pre-existing baseline)**

- `npm run test:unit` → feature tests pass; overall count ≥ the Task-1 baseline.
- `npm run typecheck` → clean.
- `npm run lint` → no NEW problems from feature files beyond the documented baseline.
- `npm run build` → success (must not error on the dropped `scheduled_time` column — verified: no reader remains).

- [ ] **Step 3: Manual smoke (controller/user — needs the migration applied first)**

`npm run dev`, then on `/habits`:
- Add a **timer** habit, frequency Mon/Wed/Sat, set Mon 07:00, Wed 07:00, Sat 09:30 → it lands under **MORNING** (earliest 07:00); card shows `MON 07:00 · WED 07:00 · SAT 09:30`.
- On the card, open the time popover → change Sat to 21:00 → Save → card updates; still grouped by earliest (07:00 → MORNING).
- Clear all → habit moves to **ANYTIME**.
- A **check** habit shows no time editor.

- [ ] **Step 4: Leave everything uncommitted**

Report the full `git status --short` for the feature's files so the user can review before committing.

---

## Self-Review

**Spec coverage:**
- JSONB `scheduled_times_json`, weekday→HH:MM, replace `scheduled_time` → Tasks 2, 3, 6, 7.
- `earliestTime` grouping → Tasks 1, 6.
- `dueWeekdays` (daily/weekly/x_per_week) + key-subset validation → Tasks 1, 2, 3.
- Timer-only → Tasks 2 (refine), 3 (action gating), 4/5/6 (UI gating).
- Per-day editor at create → Task 5; inline card editor → Task 4; compact card display → Task 6.
- Migration add+drop, live apply with authorization → Task 7.
- x_per_week excluded → `dueWeekdays` returns `[]` → Tasks 2/3 reject, Task 6 hides control.
- Verification + smoke → Task 8.

**Placeholder scan:** none — every code step has complete code; the only non-code judgement step is Task 8 Step 1 (e2e), with explicit testids listed.

**Type consistency:** `ScheduledTimes` (day-part.ts) used in schema record values via `ScheduledTimesSchema`, in actions, in `HabitTimeControl`/`HabitCard` props, and in the page record. `scheduled_times` (input/schema) vs `scheduled_times_json` (DB column + page record) are used consistently — page maps `scheduled_times_json` → card `scheduledTimes`; actions write `scheduled_times_json` from input `scheduled_times`, mirroring the existing `frequency`/`frequency_json` convention. `dueWeekdays(frequency): number[]` and `WEEKDAY_LABELS` signatures match across Tasks 1/4/5/6.
