# Home Command-Center Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy 5-tab `JarvisDashboard` on `/` with a read-only command-center overview that surfaces one glanceable instrument per subsystem (built on the canonical new data models) and links into each dedicated page.

**Architecture:** A server component (`src/app/(app)/page.tsx`) fetches the new models in parallel, derives metrics with existing pure domain helpers (`buildConsistencyModel`, `buildFocusMetrics`, `topGoalsNearestTarget`) plus three small new pure helpers, and composes a habit-consistency hero + a CSS-column masonry of read-only glance cards. The legacy dashboard and its orphaned legacy actions are deleted afterward.

**Tech Stack:** Next.js (App Router, RSC), TypeScript, Supabase, Tailwind v4 (Nothing design tokens), Vitest, date-fns-tz.

## Global Constraints

- **Workspace:** Work on `main`. **Do NOT create git commits** — leave all changes in the working tree for the user to commit. (User instruction; overrides the skill's "commit after each task" step.)
- **Read-only home:** No mutation UI on `/` (no add/edit/delete/toggle/log). CRUD stays on dedicated pages.
- **New data models only:** Never read legacy `focus_areas`, `focus_checkins`, `discipline_scores`, `habit_completions`, or legacy goal columns (`target_value`/`current_value`/`unit`/`deadline`).
- **Timezone:** Compute `today` as `toUserDate(new Date(), profile.timezone ?? 'UTC')` (`@/lib/domain/timezone`). Pass `today` as `YYYY-MM-DD` to every helper. Never bucket by raw UTC.
- **Dedup `habit_logs`:** A habit may have multiple rows per `log_date`; all consumers wrap dates in a `Set`. Never count raw rows.
- **Nothing design:** Reuse `WidgetCard`/`WidgetLink`/`WidgetEmpty` chrome; card = `mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6`; mono bracket headers; one Doto hero; accent (red) reserved for urgent only; no shadows/toasts/illustrations.
- **Tests:** Logic lives in pure, unit-tested helpers; presentational components are verified by `npm run typecheck` + `npm run build` + visual check (the project has no presentational-widget tests to mirror). Test runner: `vitest` — `import { describe, expect, it } from 'vitest'`, tests in `src/lib/domain/__tests__/*.test.ts`.

---

## File Structure

**Create**
- `src/lib/domain/home-overview.ts` — pure derivations: `monthSpendSummary`, `pillWeekAdherence`, `formatMinutes` (+ exported types `MonthSpendSummary`, `PillWeekAdherence`, `PillDayCell`).
- `src/lib/domain/__tests__/home-overview.test.ts` — unit tests for the above.
- `src/components/home/ExpensesGlance.tsx` — read-only month-spend card.
- `src/components/home/FocusGlance.tsx` — read-only deep-work-this-week card.
- `src/components/home/PillsGlance.tsx` — read-only pills today + 7-day adherence card.

**Modify**
- `src/components/habits/HabitsConsistencyInstrument.tsx` — add optional `href` prop (additive, backward compatible) so the home hero can link to `/habits`.
- `src/app/(app)/page.tsx` — full rewrite: fetch new models, compose hero + masonry.
- `src/lib/actions/events.ts` — add `revalidatePath('/')` to `createEvent`/`updateEvent`/`deleteEvent`.

**Delete** (Task 6, after `page.tsx` no longer imports them)
- `src/components/dashboard/JarvisDashboard.tsx`
- `src/components/dashboard/tabs/{Overview,Expenses,Goals,Focus,Discipline}Tab.tsx`
- `src/actions/discipline.ts`, `src/actions/focus.ts`, `src/actions/goals.ts` (legacy; only after grep confirms 0 references)

---

## Reference interfaces (already in the codebase — consume, do not redefine)

```ts
// @/lib/domain/timezone
toUserDate(utc: Date | string, tz: string): string                 // YYYY-MM-DD
userDayBounds(date: string, tz: string): { startUtc: Date; endUtc: Date }
// @/lib/domain/habit-consistency
addDaysISO(iso: string, n: number): string
buildConsistencyModel(habits: HabitForModel[], today: string, windowDays: number): ConsistencyModel
type HabitForModel = { id: string; name: string; frequency: FrequencyJson; logDates: string[]; currentStreak: number }
// @/lib/domain/streak
computeStreak(logDates: string[], frequency: FrequencyJson, today: string): { currentStreak: number; longestStreak: number; completionRate30d: number }
// @/lib/utils/focus-metrics
addDays(date: string, n: number): string
buildFocusMetrics(sessions: FocusSessionLite[], today: string): FocusMetrics   // .week.{bars,totalMin,avgMin}, .streak.{count,last14}
type FocusSessionLite = { id; localDate; startedAtMs; durationMin; plannedMinutes; completed; ended; intent; goalLabel }
// @/lib/utils/dashboard-utils
aggregateExpensesByMonth(expenses: { date: string; amount: number }[]): Record<string, number>   // 'YYYY-MM' -> total
lastNMonthKeys(n: number): string[]                                // ascending, ends current month
formatUzs(amount: number): string                                  // "12,500 so'm"
formatUzsCompact(amount: number): string                           // "1.5M so'm"
// @/components/today/WidgetCard
WidgetCard({ title, right?, children, testid? })
WidgetLink({ href, children })                                     // renders "{children} →"
WidgetEmpty({ children })
// @/components/today/TopGoalsWidget — props { goals: {id,title,status,target_date}[]; today: string }
// @/components/today/UpcomingEventsWidget — props { todayEvents, tomorrowEvents, tz }
// @/components/habits/HabitsConsistencyInstrument — props { model: ConsistencyModel; windowDays: number }
```

---

### Task 1: Pure derivations + tests (`home-overview.ts`)

**Files:**
- Create: `src/lib/domain/home-overview.ts`
- Test: `src/lib/domain/__tests__/home-overview.test.ts`

**Interfaces:**
- Consumes: `aggregateExpensesByMonth`, `lastNMonthKeys` (`@/lib/utils/dashboard-utils`); `addDaysISO` (`@/lib/domain/habit-consistency`).
- Produces:
  - `type MonthSpendSummary = { thisMonthTotal: number; prevMonthTotal: number; delta: number; monthLabel: string; trend: { key: string; total: number; isCurrent: boolean }[] }`
  - `monthSpendSummary(expenses: { date: string; amount: number }[], today: string): MonthSpendSummary`
  - `type PillDayCell = { date: string; taken: number; total: number; isToday: boolean }`
  - `type PillWeekAdherence = { takenToday: number; total: number; week: PillDayCell[] }`
  - `pillWeekAdherence(meds: { id: string }[], logs: { medication_id: string; log_date: string }[], today: string): PillWeekAdherence`
  - `formatMinutes(min: number): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/domain/__tests__/home-overview.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  formatMinutes,
  monthSpendSummary,
  pillWeekAdherence,
} from '../home-overview';

describe('formatMinutes', () => {
  it('formats sub-hour, hour, and hour+min', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(80)).toBe('1h 20m');
    expect(formatMinutes(380)).toBe('6h 20m');
  });
  it('rounds and floors negatives to 0m', () => {
    expect(formatMinutes(59.6)).toBe('1h');
    expect(formatMinutes(-5)).toBe('0m');
  });
});

describe('monthSpendSummary', () => {
  const today = '2026-06-27';
  it('totals the current month and the delta vs previous month', () => {
    const s = monthSpendSummary(
      [
        { date: '2026-06-10', amount: 100 },
        { date: '2026-06-20', amount: 50 },
        { date: '2026-05-15', amount: 200 },
      ],
      today,
    );
    expect(s.thisMonthTotal).toBe(150);
    expect(s.prevMonthTotal).toBe(200);
    expect(s.delta).toBe(-50);
    expect(s.monthLabel).toBe('JUN');
  });
  it('returns a 6-month ascending trend flagging the current month', () => {
    const s = monthSpendSummary([{ date: '2026-06-10', amount: 100 }], today);
    expect(s.trend).toHaveLength(6);
    expect(s.trend[s.trend.length - 1]).toMatchObject({ key: '2026-06', isCurrent: true });
    expect(s.trend[s.trend.length - 1].total).toBe(100);
    expect(s.trend.filter((t) => t.isCurrent)).toHaveLength(1);
  });
  it('handles the January previous-month rollover', () => {
    const s = monthSpendSummary(
      [
        { date: '2026-01-05', amount: 10 },
        { date: '2025-12-31', amount: 40 },
      ],
      '2026-01-15',
    );
    expect(s.thisMonthTotal).toBe(10);
    expect(s.prevMonthTotal).toBe(40);
    expect(s.delta).toBe(-30);
    expect(s.monthLabel).toBe('JAN');
  });
  it('returns zeros for no expenses', () => {
    const s = monthSpendSummary([], today);
    expect(s.thisMonthTotal).toBe(0);
    expect(s.prevMonthTotal).toBe(0);
    expect(s.delta).toBe(0);
  });
});

describe('pillWeekAdherence', () => {
  const today = '2026-06-27';
  const meds = [{ id: 'a' }, { id: 'b' }];
  it('counts today taken vs total and builds a 7-day window ending today', () => {
    const a = pillWeekAdherence(
      meds,
      [
        { medication_id: 'a', log_date: today },
        { medication_id: 'b', log_date: '2026-06-26' },
      ],
      today,
    );
    expect(a.total).toBe(2);
    expect(a.takenToday).toBe(1);
    expect(a.week).toHaveLength(7);
    expect(a.week[6]).toMatchObject({ date: today, taken: 1, total: 2, isToday: true });
    expect(a.week[5]).toMatchObject({ date: '2026-06-26', taken: 1, total: 2, isToday: false });
  });
  it('dedupes duplicate logs for the same med+date (multiplicity)', () => {
    const a = pillWeekAdherence(
      meds,
      [
        { medication_id: 'a', log_date: today },
        { medication_id: 'a', log_date: today },
      ],
      today,
    );
    expect(a.takenToday).toBe(1);
  });
  it('returns total 0 when there are no medications', () => {
    const a = pillWeekAdherence([], [], today);
    expect(a.total).toBe(0);
    expect(a.takenToday).toBe(0);
    expect(a.week).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/domain/__tests__/home-overview.test.ts`
Expected: FAIL — "Failed to resolve import '../home-overview'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/domain/home-overview.ts`:

```ts
import { aggregateExpensesByMonth, lastNMonthKeys } from '@/lib/utils/dashboard-utils';
import { addDaysISO } from '@/lib/domain/habit-consistency';

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

/** Previous `YYYY-MM` key, handling the January → previous-December rollover. */
function prevMonthKey(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export type MonthSpendSummary = {
  thisMonthTotal: number;
  prevMonthTotal: number;
  delta: number;
  monthLabel: string;
  trend: { key: string; total: number; isCurrent: boolean }[];
};

/**
 * Current-month spend, the signed delta vs last month, and a 6-month
 * ascending trend. `today` is a user-local YYYY-MM-DD; month keys are derived
 * by string slicing so the result is SSR-stable (no timezone drift).
 */
export function monthSpendSummary(
  expenses: { date: string; amount: number }[],
  today: string,
): MonthSpendSummary {
  const monthly = aggregateExpensesByMonth(expenses);
  const thisMonth = today.slice(0, 7);
  const prev = prevMonthKey(thisMonth);
  const thisMonthTotal = monthly[thisMonth] ?? 0;
  const prevMonthTotal = monthly[prev] ?? 0;
  const trend = lastNMonthKeys(6).map((key) => ({
    key,
    total: monthly[key] ?? 0,
    isCurrent: key === thisMonth,
  }));
  return {
    thisMonthTotal,
    prevMonthTotal,
    delta: thisMonthTotal - prevMonthTotal,
    monthLabel: MONTHS[Number(thisMonth.slice(5, 7)) - 1],
    trend,
  };
}

export type PillDayCell = {
  date: string;
  taken: number;
  total: number;
  isToday: boolean;
};

export type PillWeekAdherence = {
  takenToday: number;
  total: number;
  week: PillDayCell[];
};

/**
 * Pills taken today vs total active meds, plus a 7-day adherence window
 * ending today (today is the last cell). `logs` may contain duplicate
 * med+date rows; a Set keyed `${id}|${date}` makes counting idempotent.
 */
export function pillWeekAdherence(
  meds: { id: string }[],
  logs: { medication_id: string; log_date: string }[],
  today: string,
): PillWeekAdherence {
  const total = meds.length;
  const taken = new Set(logs.map((l) => `${l.medication_id}|${l.log_date}`));
  const week: PillDayCell[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    const count = meds.filter((m) => taken.has(`${m.id}|${date}`)).length;
    week.push({ date, taken: count, total, isToday: date === today });
  }
  return { takenToday: week[week.length - 1].taken, total, week };
}

/** Minutes as "Nm" under an hour, "Hh" on the hour, else "Hh Mm". */
export function formatMinutes(min: number): string {
  const total = Math.max(0, Math.round(min));
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/domain/__tests__/home-overview.test.ts`
Expected: PASS (all cases green).

---

### Task 2: Read-only glance components

**Files:**
- Create: `src/components/home/ExpensesGlance.tsx`
- Create: `src/components/home/FocusGlance.tsx`
- Create: `src/components/home/PillsGlance.tsx`

**Interfaces:**
- Consumes: `WidgetCard`/`WidgetLink`/`WidgetEmpty` (`@/components/today/WidgetCard`); `formatUzs`/`formatUzsCompact` (`@/lib/utils/dashboard-utils`); `MonthSpendSummary`/`PillWeekAdherence`/`formatMinutes` (`@/lib/domain/home-overview`); `FocusMetrics` (`@/lib/utils/focus-metrics`).
- Produces: `ExpensesGlance({ summary })`, `FocusGlance({ week, streakCount })`, `PillsGlance({ adherence })` — all default-exported-free named exports, server components (no hooks).

- [ ] **Step 1: Create `ExpensesGlance.tsx`**

```tsx
import {
  WidgetCard,
  WidgetEmpty,
  WidgetLink,
} from '@/components/today/WidgetCard';
import { formatUzsCompact } from '@/lib/utils/dashboard-utils';
import type { MonthSpendSummary } from '@/lib/domain/home-overview';

/** Read-only month-spend glance: compact total, delta vs last month, 6-mo trend. */
export function ExpensesGlance({ summary }: { summary: MonthSpendSummary }) {
  const { thisMonthTotal, prevMonthTotal, delta, monthLabel, trend } = summary;
  const max = Math.max(...trend.map((t) => t.total), 1);
  const hasAny = trend.some((t) => t.total > 0);

  return (
    <WidgetCard
      title={`[ SPEND · ${monthLabel} ]`}
      right={<WidgetLink href="/expenses">LEDGER</WidgetLink>}
      testid="home-expenses"
    >
      {!hasAny ? (
        <WidgetEmpty>No spend recorded</WidgetEmpty>
      ) : (
        <>
          <span className="font-doto text-4xl font-bold leading-none tracking-tight tabular-nums text-warning">
            {formatUzsCompact(thisMonthTotal)}
          </span>
          {prevMonthTotal > 0 && (
            <p
              className={`mt-2 font-mono text-[11px] uppercase tracking-[0.08em] ${
                delta < 0 ? 'text-success' : 'text-text-secondary'
              }`}
            >
              {delta < 0 ? '−' : '+'}
              {formatUzsCompact(Math.abs(delta))} VS LAST MONTH
            </p>
          )}
          <div className="mt-5 flex h-12 items-end gap-1">
            {trend.map((t) => (
              <div
                key={t.key}
                className={`flex-1 ${t.isCurrent ? 'bg-warning' : 'bg-border-visible'}`}
                style={{ height: `${Math.max(4, Math.round((t.total / max) * 100))}%` }}
              />
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
```

- [ ] **Step 2: Create `FocusGlance.tsx`**

```tsx
import {
  WidgetCard,
  WidgetEmpty,
  WidgetLink,
} from '@/components/today/WidgetCard';
import { formatMinutes } from '@/lib/domain/home-overview';
import type { FocusMetrics } from '@/lib/utils/focus-metrics';

/** Read-only deep-work glance: this-week minutes, Mon–Sun bars, current streak. */
export function FocusGlance({
  week,
  streakCount,
}: {
  week: FocusMetrics['week'];
  streakCount: number;
}) {
  const max = Math.max(...week.bars.map((b) => b.min), 1);

  return (
    <WidgetCard
      title="[ DEEP WORK · THIS WEEK ]"
      right={
        <>
          {streakCount > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
              {streakCount}D STREAK
            </span>
          )}
          <WidgetLink href="/focus">FOCUS</WidgetLink>
        </>
      }
      testid="home-focus"
    >
      {week.totalMin === 0 ? (
        <WidgetEmpty>No focus sessions this week</WidgetEmpty>
      ) : (
        <>
          <span className="font-mono text-4xl leading-none tabular-nums text-text-primary">
            {formatMinutes(week.totalMin)}
          </span>
          <div className="mt-5 flex h-12 items-end gap-1">
            {week.bars.map((b) => (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full ${b.isToday ? 'bg-text-primary' : 'bg-border-visible'}`}
                  style={{ height: `${Math.max(4, Math.round((b.min / max) * 100))}%` }}
                />
                <span
                  className={`font-mono text-[9px] uppercase ${
                    b.isToday ? 'text-text-primary' : 'text-text-disabled'
                  }`}
                >
                  {b.label[0]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
```

- [ ] **Step 3: Create `PillsGlance.tsx`**

```tsx
import {
  WidgetCard,
  WidgetEmpty,
  WidgetLink,
} from '@/components/today/WidgetCard';
import type { PillWeekAdherence } from '@/lib/domain/home-overview';

/** Read-only pills glance: today taken X/Y + a 7-day adherence strip. */
export function PillsGlance({ adherence }: { adherence: PillWeekAdherence }) {
  const { takenToday, total, week } = adherence;
  const allDone = total > 0 && takenToday === total;

  return (
    <WidgetCard
      title="[ PILLS ]"
      right={<WidgetLink href="/pills">ALL</WidgetLink>}
      testid="home-pills"
    >
      {total === 0 ? (
        <WidgetEmpty>No medications</WidgetEmpty>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-doto text-4xl font-bold leading-none tracking-tight tabular-nums ${
                allDone ? 'text-success' : 'text-text-display'
              }`}
            >
              {takenToday}
            </span>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
              / {total} TAKEN TODAY
            </span>
          </div>
          <div className="mt-5 flex gap-[3px]">
            {week.map((d) => {
              const full = d.total > 0 && d.taken === d.total;
              const partial = d.taken > 0 && d.taken < d.total;
              const cls = full
                ? 'bg-success'
                : partial
                  ? 'bg-text-primary/50'
                  : 'border border-border-visible bg-transparent';
              return (
                <div
                  key={d.date}
                  title={d.date}
                  className={`h-5 flex-1 ${cls} ${d.isToday ? 'ring-1 ring-text-secondary' : ''}`}
                />
              );
            })}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
```

- [ ] **Step 4: Verify they typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors). These are consumed and visually verified in Task 4.

---

### Task 3: Add optional `href` to `HabitsConsistencyInstrument`

**Files:**
- Modify: `src/components/habits/HabitsConsistencyInstrument.tsx`

**Interfaces:**
- Produces: `HabitsConsistencyInstrument({ model, windowDays, href? })` — `href` optional; when present, renders a quiet "HABITS →" link in the header rail. Omitting it (as `/habits` does) is unchanged behavior.

- [ ] **Step 1: Add the `Link` import**

At the top of the file, add below `'use client';`:

```tsx
import Link from 'next/link';
```

- [ ] **Step 2: Add the optional prop**

Change the `Props` interface:

```tsx
interface Props {
  model: ConsistencyModel;
  windowDays: number;
  href?: string;
}
```

And the destructure:

```tsx
export function HabitsConsistencyInstrument({ model, windowDays, href }: Props) {
```

- [ ] **Step 3: Render the link in the header rail**

Replace the verdict `<span>` in the header rail (the block that renders `{verdict.text}`) with a wrapping div that also holds the optional link:

```tsx
        <div className="flex items-baseline gap-3">
          <span className={`font-mono text-[11px] uppercase tracking-[0.08em] ${verdict.cls}`}>
            <span className="sr-only">Today: </span>
            {verdict.text}
          </span>
          {href && (
            <Link
              href={href}
              className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled transition-colors hover:text-text-primary"
            >
              HABITS →
            </Link>
          )}
        </div>
```

- [ ] **Step 4: Verify nothing regressed**

Run: `npm run typecheck && npx vitest run src/lib/domain/__tests__/habit-consistency.test.ts`
Expected: PASS. (`/habits` passes no `href`, so its render is unchanged.)

---

### Task 4: Rewrite the home page (`page.tsx`)

**Files:**
- Modify (full rewrite): `src/app/(app)/page.tsx`

**Interfaces:**
- Consumes everything from Tasks 1–3 plus `TopGoalsWidget`, `UpcomingEventsWidget`, `HabitsConsistencyInstrument`, `WidgetLink`, and the domain helpers in the reference block.
- Produces: the new default-exported `HomePage` server component. After this task, `JarvisDashboard` is no longer imported anywhere.

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate, userDayBounds } from '@/lib/domain/timezone';
import { formatInTimeZone } from 'date-fns-tz';
import { computeStreak } from '@/lib/domain/streak';
import {
  addDaysISO,
  buildConsistencyModel,
  type HabitForModel,
} from '@/lib/domain/habit-consistency';
import {
  addDays,
  buildFocusMetrics,
  type FocusSessionLite,
} from '@/lib/utils/focus-metrics';
import type { FrequencyJson } from '@/lib/schemas/habits';
import {
  monthSpendSummary,
  pillWeekAdherence,
} from '@/lib/domain/home-overview';
import { HabitsConsistencyInstrument } from '@/components/habits/HabitsConsistencyInstrument';
import { TopGoalsWidget } from '@/components/today/TopGoalsWidget';
import { UpcomingEventsWidget } from '@/components/today/UpcomingEventsWidget';
import { ExpensesGlance } from '@/components/home/ExpensesGlance';
import { FocusGlance } from '@/components/home/FocusGlance';
import { PillsGlance } from '@/components/home/PillsGlance';

const HABIT_WINDOW_DAYS = 30;
const FOCUS_WINDOW_MS = 70 * 24 * 60 * 60 * 1000;

export default async function HomePage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, timezone')
    .eq('id', userId)
    .single();
  const displayName =
    (profile as { display_name?: string | null } | null)?.display_name ?? null;
  const tz = (profile as { timezone?: string } | null)?.timezone ?? 'UTC';

  const now = new Date();
  const today = toUserDate(now, tz);
  const tomorrow = addDaysISO(today, 1);

  // Query windows.
  const habitSince = addDaysISO(today, -60);
  const pillSince = addDaysISO(today, -6);
  const { startUtc } = userDayBounds(today, tz);
  const { endUtc: tomorrowEndUtc } = userDayBounds(tomorrow, tz);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);
  const focusSinceIso = new Date(now.getTime() - FOCUS_WINDOW_MS).toISOString();

  const [
    habitsResult,
    habitLogsResult,
    activeGoalsResult,
    expensesResult,
    medicationsResult,
    medicationLogsResult,
    eventsResult,
    focusSessionsResult,
  ] = await Promise.all([
    supabase
      .from('habits')
      .select('id, name, frequency_json')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_logs')
      .select('habit_id, log_date')
      .eq('user_id', userId)
      .gte('log_date', habitSince),
    supabase
      .from('goals')
      .select('id, title, status, target_date')
      .eq('user_id', userId)
      .eq('status', 'active'),
    supabase
      .from('expenses')
      .select('amount, date')
      .eq('user_id', userId)
      .gte('date', sixMonthsAgoStr),
    supabase
      .from('medications')
      .select('id, name')
      .eq('user_id', userId)
      .is('archived_at', null),
    supabase
      .from('medication_logs')
      .select('medication_id, log_date')
      .eq('user_id', userId)
      .gte('log_date', pillSince),
    supabase
      .from('events')
      .select('id, title, starts_at, ends_at, kind')
      .eq('user_id', userId)
      .gte('starts_at', startUtc.toISOString())
      .lt('starts_at', tomorrowEndUtc.toISOString())
      .order('starts_at', { ascending: true }),
    supabase
      .from('focus_sessions')
      .select('id, started_at, ended_at, planned_minutes, completed, intent')
      .eq('user_id', userId)
      .gte('started_at', focusSinceIso)
      .order('started_at', { ascending: false }),
  ]);

  // ── Habit consistency hero ──────────────────────────────────────────────
  const habits = (habitsResult.data ?? []) as Array<{
    id: string;
    name: string;
    frequency_json: FrequencyJson;
  }>;
  const habitLogs = (habitLogsResult.data ?? []) as Array<{
    habit_id: string;
    log_date: string;
  }>;
  const logsByHabit = new Map<string, string[]>();
  for (const l of habitLogs) {
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, []);
    logsByHabit.get(l.habit_id)!.push(l.log_date);
  }
  const habitModel = buildConsistencyModel(
    habits.map<HabitForModel>((h) => {
      const dates = logsByHabit.get(h.id) ?? [];
      return {
        id: h.id,
        name: h.name,
        frequency: h.frequency_json,
        logDates: dates,
        currentStreak: computeStreak(dates, h.frequency_json, today).currentStreak,
      };
    }),
    today,
    HABIT_WINDOW_DAYS,
  );

  // ── Goals ────────────────────────────────────────────────────────────────
  const activeGoals = (activeGoalsResult.data ?? []) as Array<{
    id: string;
    title: string;
    status: 'active';
    target_date: string | null;
  }>;

  // ── Expenses ───────────────────────────────────────────────────────────────
  const expenses = (expensesResult.data ?? []) as Array<{
    amount: number;
    date: string;
  }>;
  const spend = monthSpendSummary(expenses, today);

  // ── Pills ──────────────────────────────────────────────────────────────────
  const medications = (medicationsResult.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const medicationLogs = (medicationLogsResult.data ?? []) as Array<{
    medication_id: string;
    log_date: string;
  }>;
  const pills = pillWeekAdherence(medications, medicationLogs, today);

  // ── Events (today + tomorrow agenda) ────────────────────────────────────────
  const upcomingEvents = (eventsResult.data ?? []) as Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    kind: 'event' | 'appointment' | 'milestone';
  }>;
  const todayEvents = upcomingEvents
    .map((e) => ({ ...e, localDate: toUserDate(e.starts_at, tz) }))
    .filter((e) => e.localDate === today);
  const tomorrowEvents = upcomingEvents
    .map((e) => ({ ...e, localDate: toUserDate(e.starts_at, tz) }))
    .filter((e) => e.localDate === tomorrow);

  // ── Focus (this week + streak) ──────────────────────────────────────────────
  const focusWindowStart = addDays(today, -60);
  const focusSessions: FocusSessionLite[] = (
    (focusSessionsResult.data ?? []) as Array<{
      id: string;
      started_at: string;
      ended_at: string | null;
      planned_minutes: number;
      completed: boolean;
      intent: string | null;
    }>
  )
    .map((r) => {
      const ended = r.ended_at != null;
      const startedAtMs = new Date(r.started_at).getTime();
      const durationMin = !ended
        ? 0
        : r.completed
          ? r.planned_minutes
          : Math.max(
              0,
              Math.round(
                (new Date(r.ended_at as string).getTime() - startedAtMs) / 60000,
              ),
            );
      return {
        id: r.id,
        localDate: toUserDate(r.started_at, tz),
        startedAtMs,
        durationMin,
        plannedMinutes: r.planned_minutes,
        completed: r.completed,
        ended,
        intent: r.intent,
        goalLabel: null,
      };
    })
    .filter((s) => s.localDate >= focusWindowStart);
  const focusMetrics = buildFocusMetrics(focusSessions, today);

  const dateLabel = formatInTimeZone(now, tz, 'EEE d MMMM yyyy').toUpperCase();

  return (
    <main className="w-full space-y-4 px-4 py-8">
      <header className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">
            JARVIS
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            {dateLabel}
          </p>
        </div>
        {displayName && (
          <div className="flex size-10 shrink-0 items-center justify-center border border-border-visible font-mono text-[13px] uppercase text-text-primary">
            {displayName[0].toUpperCase()}
          </div>
        )}
      </header>

      <HabitsConsistencyInstrument
        model={habitModel}
        windowDays={HABIT_WINDOW_DAYS}
        href="/habits"
      />

      <div className="gap-4 lg:columns-2 xl:columns-3">
        <TopGoalsWidget goals={activeGoals} today={today} />
        <ExpensesGlance summary={spend} />
        <FocusGlance week={focusMetrics.week} streakCount={focusMetrics.streak.count} />
        <PillsGlance adherence={pills} />
        <UpcomingEventsWidget
          todayEvents={todayEvents}
          tomorrowEvents={tomorrowEvents}
          tz={tz}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck, lint, build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS (no type/lint errors; `/` builds). If the build flags `JarvisDashboard` as unused — it is no longer imported here; its files are deleted in Task 6.

- [ ] **Step 3: Visual verification**

Run: `npm run dev`, open `/`, and confirm: the JARVIS header + date render; the consistency hero shows `done/due TODAY` with the 30-day field and a "HABITS →" link; the masonry shows GOALS, SPEND, DEEP WORK, PILLS, AGENDA cards; empty datasets show mono empty lines (no errors). Then stop the dev server.

---

### Task 5: Revalidate `/` on event mutations

**Files:**
- Modify: `src/lib/actions/events.ts`

**Interfaces:**
- Consumes: existing `revalidatePath` import. Produces: no signature change — `createEvent`/`updateEvent`/`deleteEvent` now also revalidate `/`.

- [ ] **Step 1: Add `revalidatePath('/')` to each mutation**

In `createEvent`, `updateEvent`, and `deleteEvent`, immediately after each existing `revalidatePath('/today');` line, add:

```ts
  revalidatePath('/');
```

(Three insertions total — one per function.)

- [ ] **Step 2: Audit sibling mutations for `/` freshness**

Run: `grep -rL "revalidatePath('/')" src/lib/actions/habits.ts src/lib/actions/medications.ts src/lib/actions/focus.ts src/lib/actions/goals.ts`
For any file listed (i.e. that does NOT already revalidate `/`), add `revalidatePath('/');` alongside its existing `revalidatePath(...)` calls in every exported mutation, so habit/pill/focus/goal changes refresh the home glances. (`src/actions/expenses.ts` already revalidates `/` — leave it.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

### Task 6: Delete the legacy dashboard and orphaned actions

**Files:**
- Delete: `src/components/dashboard/JarvisDashboard.tsx`, `src/components/dashboard/tabs/*.tsx`
- Delete (conditional): `src/actions/discipline.ts`, `src/actions/focus.ts`, `src/actions/goals.ts`

**Interfaces:** none (pure removal).

- [ ] **Step 1: Confirm the dashboard is unreferenced**

Run: `grep -rn "components/dashboard\|JarvisDashboard" src`
Expected: 0 matches (Task 4 removed the only import). If any remain, fix them before deleting.

- [ ] **Step 2: Delete the dashboard directory**

Run: `rm -rf src/components/dashboard`

- [ ] **Step 3: Confirm legacy actions are orphaned, then delete them**

Run: `grep -rn "@/actions/discipline\|@/actions/focus\|@/actions/goals" src`
Expected: 0 matches (these were imported only by the now-deleted tabs).
- If `@/actions/discipline` has 0 matches: `rm src/actions/discipline.ts`
- If `@/actions/focus` has 0 matches: `rm src/actions/focus.ts`
- If `@/actions/goals` has 0 matches: `rm src/actions/goals.ts`
- For any that still has matches, leave the file and note the remaining consumer (do NOT delete it).
Do NOT delete `src/actions/expenses.ts` or `src/actions/auth.ts` (still imported by `/expenses` and auth/sidebar).

- [ ] **Step 4: Full verification**

Run: `npm run typecheck && npm run lint && npm run build && npm run test:unit`
Expected: all PASS — no dangling imports, `/` builds, unit suite green.

---

## Self-Review

**1. Spec coverage**
- Teardown of `src/components/dashboard/` + legacy actions → Task 6. ✓
- Rewrite `page.tsx` on new models → Task 4. ✓
- Drop `focus_areas`/`discipline_scores` (never queried) → enforced by Task 4 queries + Global Constraints. ✓
- Habit-consistency hero → Tasks 3 + 4. ✓
- Read-only glances (Goals reuse, Expenses/Focus/Pills new, Agenda reuse) → Tasks 2 + 4. ✓
- Data layer with tz/dedup/normalizeStatus(via `status='active'` filter)/prev-month rollover → Tasks 1 + 4. ✓
- `revalidatePath('/')` on events + audit → Task 5. ✓
- Testing strategy (pure helpers tested; components via typecheck/build/visual) → Task 1 + Global Constraints. ✓
- No git commits (user instruction) → Global Constraints; no commit steps in any task. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows full code; the only conditional logic (Task 5 audit, Task 6 deletes) is gated on explicit grep output with named files. ✓

**3. Type consistency:** `MonthSpendSummary`/`PillWeekAdherence`/`formatMinutes` defined in Task 1 are consumed with identical names/shapes in Tasks 2 + 4. `FocusMetrics['week']` and `.streak.count` match the verified `focus-metrics.ts` shape. `HabitForModel` fields (`id,name,frequency,logDates,currentStreak`) match `habit-consistency.ts`. `TopGoalsWidget`/`UpcomingEventsWidget`/`HabitsConsistencyInstrument` props match their definitions (the `href` addition is from Task 3). ✓

## Out of scope (follow-ups, not in this plan)
- DB migration to drop `focus_areas`, `focus_checkins`, `discipline_scores` (+ evaluate `habit_completions`) and legacy `goals` columns.
- Removing now-unused legacy types from `@/types`.
- Any change to `/today` or the dedicated pages.
