# Home Workout Glances Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two read-only workout glance cards — `LiftsGlance` (big-5 logged this week) and `BodyWeightGlance` (weight → target) — to the home command center.

**Architecture:** Follows the existing home-glance pattern (`ExpensesGlance`/`FocusGlance`/`PillsGlance`): each card is a presentational `WidgetCard` fed by data computed in the server page. Pure date/number math lives in tested helpers; the big-5 lift math reuses the already-tested `buildLiftRows`, and one new tested helper `bodyWeightSummary` handles weight normalization. No schema changes, no mutations.

**Tech Stack:** Next.js (App Router, server components), TypeScript, Tailwind (Nothing design tokens), Supabase JS, Vitest + Testing Library.

## Global Constraints

- **Next.js is non-standard here.** Before writing/altering server-component data fetching, skim the relevant guide under `node_modules/next/dist/docs/`. The page change mirrors the existing `src/app/(app)/page.tsx` 1:1 — do not introduce new Next APIs.
- **Read-only surfaces.** No mutations, no `revalidatePath`, no client directives — these glances are pure server-rendered presentational components like their siblings.
- **No emoji** anywhere in UI copy. Mono caps labels only.
- **Supabase numerics may be strings.** Always coerce `weight_kg` / `target_weight_kg` with `Number(x)` guarded by `!= null`, exactly as `src/app/(app)/workout/page.tsx` does.
- **Design tokens already in use** (reuse, do not invent): `font-doto`, `font-mono`, `text-text-display`, `text-text-primary`, `text-text-secondary`, `text-text-disabled`, `text-success`, `text-accent`, `bg-text-primary`, `bg-surface`, `border-border`; CSS vars `var(--success)`, `var(--accent)`, `var(--text-secondary)`, `var(--border-visible)`.
- **Component verification matches siblings.** The glance components are not unit-tested (neither are `ExpensesGlance`/`FocusGlance`/`PillsGlance`); they are verified by `npm run typecheck` + `npm run lint` + `npm run build`. Only the pure `bodyWeightSummary` helper is TDD'd with Vitest.

---

## File Structure

**New:**
- `src/components/home/LiftsGlance.tsx` — presentational big-5 glance.
- `src/components/home/BodyWeightGlance.tsx` — presentational weight glance.

**Modified:**
- `src/lib/domain/home-overview.ts` — add `bodyWeightSummary` + `BodyWeightSummary` type + private `dayDiff`.
- `src/lib/domain/__tests__/home-overview.test.ts` — add `bodyWeightSummary` tests.
- `src/app/(app)/page.tsx` — two queries, derive data, render two cards.

**Reused unchanged:** `src/lib/utils/lift-metrics.ts` (`buildLiftRows`, `weekStart`, `LIFTS`, `LiftRow`, `LiftEntry`), `src/lib/domain/habit-consistency.ts` (`addDaysISO`), `src/components/today/WidgetCard.tsx` (`WidgetCard`, `WidgetEmpty`, `WidgetLink`).

---

### Task 1: `bodyWeightSummary` helper (TDD)

**Files:**
- Modify: `src/lib/domain/home-overview.ts`
- Test: `src/lib/domain/__tests__/home-overview.test.ts`

**Interfaces:**
- Consumes: `addDaysISO(iso, n)` from `@/lib/domain/habit-consistency` (already imported in this file).
- Produces:
  ```ts
  export type BodyWeightSummary = {
    latest: number | null;
    latestDate: string | null;
    target: number | null;
    deltaToTarget: number | null;            // latest - target
    netDelta: number | null;                 // latest - earliest, when >= 2 points
    towardTarget: 'toward' | 'away' | 'flat' | null;
    count: number;
    spark: { x: number; y: number }[];       // 0..100, oldest -> newest
    targetY: number | null;                  // 0..100
  };
  export function bodyWeightSummary(
    metrics: { date: string; weight_kg: number | null }[],
    targetWeight: number | null,
    today: string,
    days: number,
  ): BodyWeightSummary;
  ```

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/domain/__tests__/home-overview.test.ts`. First extend the existing import at the top of the file:

```ts
import {
  bodyWeightSummary,
  formatMinutes,
  monthSpendSummary,
  pillWeekAdherence,
} from '../home-overview';
```

Then append this block at the end of the file:

```ts
describe('bodyWeightSummary', () => {
  const today = '2026-06-27';

  it('returns an empty summary when there are no weigh-ins', () => {
    const s = bodyWeightSummary([], 80, today, 90);
    expect(s.latest).toBeNull();
    expect(s.latestDate).toBeNull();
    expect(s.count).toBe(0);
    expect(s.spark).toEqual([]);
    expect(s.targetY).toBeNull();
    expect(s.netDelta).toBeNull();
    expect(s.deltaToTarget).toBeNull();
    expect(s.towardTarget).toBeNull();
  });

  it('reports latest weight, distance to target, and toward-target progress', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-04-01', weight_kg: 86 },
        { date: '2026-05-01', weight_kg: 84 },
        { date: '2026-06-20', weight_kg: 82.4 },
      ],
      80,
      today,
      90,
    );
    expect(s.latest).toBe(82.4);
    expect(s.latestDate).toBe('2026-06-20');
    expect(s.target).toBe(80);
    expect(s.deltaToTarget).toBeCloseTo(2.4);
    expect(s.netDelta).toBeCloseTo(-3.6);
    expect(s.towardTarget).toBe('toward');
    expect(s.count).toBe(3);
  });

  it('flags away-from-target when latest is farther than the first weigh-in', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-06-01', weight_kg: 80.5 },
        { date: '2026-06-20', weight_kg: 82 },
      ],
      80,
      today,
      90,
    );
    expect(s.towardTarget).toBe('away');
  });

  it('ignores null weigh-ins and sorts out of order input', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-06-20', weight_kg: 82 },
        { date: '2026-06-10', weight_kg: null },
        { date: '2026-06-01', weight_kg: 84 },
      ],
      null,
      today,
      90,
    );
    expect(s.count).toBe(2);
    expect(s.latest).toBe(82);
    expect(s.netDelta).toBe(-2);
  });

  it('falls back to net delta and no target line when no target is set', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-06-01', weight_kg: 84 },
        { date: '2026-06-20', weight_kg: 82 },
      ],
      null,
      today,
      90,
    );
    expect(s.target).toBeNull();
    expect(s.deltaToTarget).toBeNull();
    expect(s.towardTarget).toBeNull();
    expect(s.netDelta).toBe(-2);
    expect(s.targetY).toBeNull();
  });

  it('handles a single weigh-in: no net delta, one spark point', () => {
    const s = bodyWeightSummary([{ date: '2026-06-20', weight_kg: 82 }], 80, today, 90);
    expect(s.count).toBe(1);
    expect(s.netDelta).toBeNull();
    expect(s.towardTarget).toBeNull();
    expect(s.spark).toHaveLength(1);
  });

  it('normalizes the sparkline within 0..100 with the latest point at x=100', () => {
    const s = bodyWeightSummary(
      [
        { date: '2026-04-01', weight_kg: 86 },
        { date: today, weight_kg: 82 },
      ],
      80,
      today,
      90,
    );
    expect(s.spark).toHaveLength(2);
    for (const p of s.spark) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
    expect(s.spark[s.spark.length - 1].x).toBeCloseTo(100);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/lib/domain/__tests__/home-overview.test.ts`
Expected: FAIL — `bodyWeightSummary is not a function` (or import error).

- [ ] **Step 3: Implement `bodyWeightSummary`**

Append to `src/lib/domain/home-overview.ts` (the file already imports `addDaysISO`):

```ts
/** Whole-day difference b − a for date-only ISO strings (UTC midnight). */
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export type BodyWeightSummary = {
  latest: number | null;
  latestDate: string | null;
  target: number | null;
  deltaToTarget: number | null;
  netDelta: number | null;
  towardTarget: 'toward' | 'away' | 'flat' | null;
  count: number;
  spark: { x: number; y: number }[];
  targetY: number | null;
};

/**
 * Latest weigh-in, distance to target, net change over the window, and a
 * pre-normalized sparkline (x/y in 0..100) for a compact SVG. Mirrors the
 * proven axis math in WeightTrendCard: x spans [windowStart, today] (widened
 * left if an older point slips in), y spans the weight range plus the target,
 * padded 12% so the line breathes. `today` is a user-local YYYY-MM-DD; all math
 * is pure and SSR-stable.
 */
export function bodyWeightSummary(
  metrics: { date: string; weight_kg: number | null }[],
  targetWeight: number | null,
  today: string,
  days: number,
): BodyWeightSummary {
  const pts = metrics
    .filter((m): m is { date: string; weight_kg: number } => m.weight_kg != null)
    .map((m) => ({ date: m.date, weight: Number(m.weight_kg) }))
    .sort((a, b) => a.date.localeCompare(b.date)); // oldest -> newest

  const target = targetWeight;
  const count = pts.length;

  if (count === 0) {
    return {
      latest: null,
      latestDate: null,
      target,
      deltaToTarget: null,
      netDelta: null,
      towardTarget: null,
      count: 0,
      spark: [],
      targetY: null,
    };
  }

  const earliest = pts[0];
  const latest = pts[pts.length - 1];
  const netDelta = count >= 2 ? latest.weight - earliest.weight : null;
  const deltaToTarget = target != null ? latest.weight - target : null;

  let towardTarget: BodyWeightSummary['towardTarget'] = null;
  if (target != null && count >= 2) {
    const before = Math.abs(earliest.weight - target);
    const after = Math.abs(latest.weight - target);
    towardTarget = after < before ? 'toward' : after > before ? 'away' : 'flat';
  }

  // x-axis spans [windowStart, today]; widen left if an older point slips in.
  const windowStart = addDaysISO(today, -(days - 1));
  const spanStart = earliest.date < windowStart ? earliest.date : windowStart;
  const spanDays = Math.max(1, dayDiff(spanStart, today));
  const xOf = (date: string) => (dayDiff(spanStart, date) / spanDays) * 100;

  // y-axis spans the weight range (plus target), padded so the line breathes.
  const weights = pts.map((p) => p.weight);
  const valuesForRange = target != null ? [...weights, target] : weights;
  let lo = Math.min(...valuesForRange);
  let hi = Math.max(...valuesForRange);
  if (hi === lo) {
    hi = lo + 1;
    lo = lo - 1;
  }
  const pad = (hi - lo) * 0.12;
  const yBot = lo - pad;
  const yTop = hi + pad;
  const yOf = (w: number) => 100 - ((w - yBot) / (yTop - yBot)) * 100;

  const spark = pts.map((p) => ({ x: xOf(p.date), y: yOf(p.weight) }));
  const targetY = target != null ? yOf(target) : null;

  return {
    latest: latest.weight,
    latestDate: latest.date,
    target,
    deltaToTarget,
    netDelta,
    towardTarget,
    count,
    spark,
    targetY,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- src/lib/domain/__tests__/home-overview.test.ts`
Expected: PASS — all `bodyWeightSummary` tests green, existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/home-overview.ts src/lib/domain/__tests__/home-overview.test.ts
git commit -m "feat(home): bodyWeightSummary helper for body-weight glance"
```

---

### Task 2: `BodyWeightGlance` component

**Files:**
- Create: `src/components/home/BodyWeightGlance.tsx`

**Interfaces:**
- Consumes: `BodyWeightSummary` from `@/lib/domain/home-overview` (Task 1); `WidgetCard`, `WidgetEmpty`, `WidgetLink` from `@/components/today/WidgetCard`.
- Produces: `export function BodyWeightGlance({ summary, days }: { summary: BodyWeightSummary; days: number })`.

- [ ] **Step 1: Create the component**

Create `src/components/home/BodyWeightGlance.tsx`:

```tsx
import {
  WidgetCard,
  WidgetEmpty,
  WidgetLink,
} from '@/components/today/WidgetCard';
import type { BodyWeightSummary } from '@/lib/domain/home-overview';

/** Read-only body-weight glance: latest weigh-in, distance to target, 90-day sparkline. */
export function BodyWeightGlance({
  summary,
  days,
}: {
  summary: BodyWeightSummary;
  days: number;
}) {
  const { latest, target, deltaToTarget, netDelta, towardTarget, count, spark, targetY } =
    summary;

  const trendClass =
    towardTarget === 'toward'
      ? 'text-success'
      : towardTarget === 'away'
        ? 'text-accent'
        : 'text-text-secondary';
  const strokeVar =
    towardTarget === 'toward'
      ? 'var(--success)'
      : towardTarget === 'away'
        ? 'var(--accent)'
        : 'var(--text-secondary)';

  let secondary: string;
  if (target != null && deltaToTarget != null) {
    if (deltaToTarget > 0) {
      secondary = `${Math.abs(deltaToTarget).toFixed(1)} KG ABOVE TARGET · ${target.toFixed(1)}`;
    } else if (deltaToTarget < 0) {
      secondary = `${Math.abs(deltaToTarget).toFixed(1)} KG BELOW TARGET · ${target.toFixed(1)}`;
    } else {
      secondary = `AT TARGET · ${target.toFixed(1)}`;
    }
  } else if (netDelta != null) {
    const glyph = netDelta > 0 ? '▲' : netDelta < 0 ? '▼' : '=';
    secondary = `${glyph} ${Math.abs(netDelta).toFixed(1)} KG · ${days}D`;
  } else {
    secondary = 'ONE ENTRY';
  }

  const linePoints = spark.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const last = spark.length > 0 ? spark[spark.length - 1] : null;

  return (
    <WidgetCard
      title="[ BODY WEIGHT ]"
      right={<WidgetLink href="/workout">GYM</WidgetLink>}
      testid="home-bodyweight"
    >
      {count === 0 || latest == null ? (
        <WidgetEmpty>No weigh-ins</WidgetEmpty>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-doto text-4xl font-bold leading-none tracking-tight tabular-nums text-text-display">
              {latest.toFixed(1)}
            </span>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
              KG
            </span>
          </div>
          <p
            className={`mt-2 font-mono text-[11px] uppercase tracking-[0.08em] ${trendClass}`}
          >
            {secondary}
          </p>
          <div className="relative mt-5 h-16 w-full">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {targetY != null && (
                <line
                  x1="0"
                  y1={targetY}
                  x2="100"
                  y2={targetY}
                  stroke="var(--border-visible)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {spark.length >= 2 && (
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke={strokeVar}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {last && (
              <div
                className="absolute h-2 w-2 rounded-full"
                style={{
                  left: `${last.x}%`,
                  top: `${last.y}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: strokeVar,
                }}
              />
            )}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
```

- [ ] **Step 2: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS — no errors. (Build is exercised at Task 4 once the component is wired in.)

- [ ] **Step 3: Commit**

```bash
git add src/components/home/BodyWeightGlance.tsx
git commit -m "feat(home): BodyWeightGlance card"
```

---

### Task 3: `LiftsGlance` component

**Files:**
- Create: `src/components/home/LiftsGlance.tsx`

**Interfaces:**
- Consumes: `LiftRow` from `@/lib/utils/lift-metrics`; `WidgetCard`, `WidgetLink` from `@/components/today/WidgetCard`.
- Produces: `export function LiftsGlance({ rows, loggedCount }: { rows: LiftRow[]; loggedCount: number })`.

Reminder of the shape this consumes (defined in `src/lib/utils/lift-metrics.ts`, do not redefine):
```ts
interface LiftRow {
  def: { key: string; display: string; bodyweight: boolean };
  current: { weight: number | null; reps: number } | null;
  previous: { week_start: string; weight: number | null; reps: number } | null;
  trend: { delta: number; dir: 'up' | 'down' | 'flat' } | null;
  weightChanged: boolean;
  history: { week_start: string; reps: number; weight: number | null }[];
}
```

- [ ] **Step 1: Create the component**

Create `src/components/home/LiftsGlance.tsx`:

```tsx
import { WidgetCard, WidgetLink } from '@/components/today/WidgetCard';
import type { LiftRow } from '@/lib/utils/lift-metrics';

/** Read-only big-5 glance: lifts logged this week (X/5) + per-lift rep bars and weekly trend. */
export function LiftsGlance({
  rows,
  loggedCount,
}: {
  rows: LiftRow[];
  loggedCount: number;
}) {
  const total = rows.length;
  const allDone = total > 0 && loggedCount === total;
  const maxReps = Math.max(1, ...rows.map((r) => r.current?.reps ?? 0));

  return (
    <WidgetCard
      title="[ LIFTS · THIS WEEK ]"
      right={<WidgetLink href="/workout">GYM</WidgetLink>}
      testid="home-lifts"
    >
      <div className="flex items-baseline gap-2">
        <span
          className={`font-doto text-4xl font-bold leading-none tracking-tight tabular-nums ${
            allDone ? 'text-success' : 'text-text-display'
          }`}
        >
          {loggedCount}
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
          / {total} LOGGED
        </span>
      </div>
      <div className="mt-5 space-y-2">
        {rows.map((row) => {
          const logged = row.current != null;
          const reps = row.current?.reps ?? 0;
          const width = logged ? Math.max(6, Math.round((reps / maxReps) * 100)) : 0;
          const dir = row.trend?.dir ?? null;
          const delta = row.trend?.delta ?? 0;
          const trendText =
            dir === 'up' ? `↑ +${delta}` : dir === 'down' ? `↓ −${Math.abs(delta)}` : '·';
          const trendClass =
            dir === 'up'
              ? 'text-success'
              : dir === 'down'
                ? 'text-accent'
                : 'text-text-disabled';
          return (
            <div key={row.def.key} className="flex items-center gap-3">
              <span
                className={`w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] ${
                  logged ? 'text-text-secondary' : 'text-text-disabled'
                }`}
              >
                {row.def.display}
              </span>
              <div className="h-2 flex-1">
                {logged ? (
                  <div className="h-full bg-text-primary" style={{ width: `${width}%` }} />
                ) : (
                  <span className="font-mono text-[10px] leading-none text-text-disabled">
                    ──
                  </span>
                )}
              </div>
              <span
                className={`w-10 shrink-0 text-right font-mono text-[10px] tabular-nums ${trendClass}`}
              >
                {trendText}
              </span>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
```

- [ ] **Step 2: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/LiftsGlance.tsx
git commit -m "feat(home): LiftsGlance card"
```

---

### Task 4: Wire both glances into the home page

**Files:**
- Modify: `src/app/(app)/page.tsx`

**Interfaces:**
- Consumes: `bodyWeightSummary` / `BodyWeightSummary` (Task 1), `BodyWeightGlance` (Task 2), `LiftsGlance` (Task 3), `buildLiftRows` / `weekStart` / `LiftEntry` (existing `lift-metrics`), `addDaysISO` (already imported).

- [ ] **Step 1: Add imports**

In `src/app/(app)/page.tsx`, add to the import block (after the existing `PillsGlance` import on line 26):

```ts
import { LiftsGlance } from '@/components/home/LiftsGlance';
import { BodyWeightGlance } from '@/components/home/BodyWeightGlance';
import {
  weekStart,
  buildLiftRows,
  type LiftEntry,
} from '@/lib/utils/lift-metrics';
```

And extend the existing `home-overview` import (currently `monthSpendSummary, pillWeekAdherence`) to also pull `bodyWeightSummary`:

```ts
import {
  bodyWeightSummary,
  monthSpendSummary,
  pillWeekAdherence,
} from '@/lib/domain/home-overview';
```

- [ ] **Step 2: Add window constants**

Below the existing constants (`HABIT_WINDOW_DAYS`, `FOCUS_WINDOW_MS` near line 28-29), add:

```ts
const LIFT_WEEKS = 2; // current + previous week, enough for the weekly trend
const WEIGHT_TREND_DAYS = 90;
```

- [ ] **Step 3: Extend the profiles query and add the two new queries**

Change the `profiles` select to include the target weight:

```ts
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, timezone, target_weight_kg')
    .eq('id', userId)
    .single();
```

Add the two query-window values next to the other windows (after the `focusSinceIso` line, ~line 56):

```ts
  const thisMonday = weekStart(today);
  const liftSince = addDaysISO(thisMonday, -7 * (LIFT_WEEKS - 1));
  const weightSince = addDaysISO(today, -(WEIGHT_TREND_DAYS - 1));
```

Add two entries to the END of the `Promise.all([...])` array (after the `focus_sessions` query) and to its destructuring. The destructuring becomes:

```ts
  const [
    habitsResult,
    habitLogsResult,
    activeGoalsResult,
    expensesResult,
    medicationsResult,
    medicationLogsResult,
    eventsResult,
    focusSessionsResult,
    weeklyLiftsResult,
    bodyMetricsResult,
  ] = await Promise.all([
```

and the two appended queries (place them after the existing `focus_sessions` query block, before the closing `]);`):

```ts
    supabase
      .from('weekly_lifts')
      .select('exercise, week_start, weight_kg, reps')
      .eq('user_id', userId)
      .gte('week_start', liftSince),
    supabase
      .from('body_metrics')
      .select('date, weight_kg')
      .eq('user_id', userId)
      .gte('date', weightSince),
```

- [ ] **Step 4: Derive the glance data**

Add after the Pills block (after the `const pills = pillWeekAdherence(...)` line, ~line 168):

```ts
  // ── Lifts (big-5 this week) ─────────────────────────────────────────────────
  const weeklyLifts = (weeklyLiftsResult.data ?? []) as Array<{
    exercise: LiftEntry['exercise'];
    week_start: string;
    weight_kg: number | string | null;
    reps: number;
  }>;
  const liftEntries: LiftEntry[] = weeklyLifts.map((l) => ({
    exercise: l.exercise,
    week_start: l.week_start,
    weight_kg: l.weight_kg != null ? Number(l.weight_kg) : null,
    reps: l.reps,
  }));
  const liftRows = buildLiftRows(liftEntries, today, LIFT_WEEKS);
  const liftsLoggedCount = liftRows.filter((r) => r.current != null).length;

  // ── Body weight (→ target) ──────────────────────────────────────────────────
  const bodyMetrics = (bodyMetricsResult.data ?? []) as Array<{
    date: string;
    weight_kg: number | string | null;
  }>;
  const targetWeight =
    (profile as { target_weight_kg?: number | string | null } | null)?.target_weight_kg != null
      ? Number((profile as { target_weight_kg?: number | string | null }).target_weight_kg)
      : null;
  const bodyWeight = bodyWeightSummary(
    bodyMetrics.map((b) => ({
      date: b.date,
      weight_kg: b.weight_kg != null ? Number(b.weight_kg) : null,
    })),
    targetWeight,
    today,
    WEIGHT_TREND_DAYS,
  );
```

- [ ] **Step 5: Render the two cards**

In the masonry grid, insert the two cards immediately after `<PillsGlance adherence={pills} />`:

```tsx
        <PillsGlance adherence={pills} />
        <LiftsGlance rows={liftRows} loggedCount={liftsLoggedCount} />
        <BodyWeightGlance summary={bodyWeight} days={WEIGHT_TREND_DAYS} />
        <UpcomingEventsWidget
```

- [ ] **Step 6: Full verification**

Run: `npm run typecheck && npm run lint && npm run test:run && npm run build`
Expected: PASS — typecheck clean, lint clean, all unit tests green (including the new `bodyWeightSummary` suite), production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/'(app)'/page.tsx
git commit -m "feat(home): render Lifts and Body-weight glances on the command center"
```

---

## Self-Review

**Spec coverage:**
- `LiftsGlance` (X/5 + per-lift bars + trend, reuses `buildLiftRows`) → Task 3 + Task 4 wiring. ✓
- `BodyWeightGlance` (latest + distance-to-target + sparkline, `bodyWeightSummary`) → Task 1 + Task 2 + Task 4 wiring. ✓
- Page wiring (profiles `target_weight_kg`, `weekly_lifts`, `body_metrics`, placement after Pills) → Task 4. ✓
- Edge cases: no lifts → 0/5 dim (LiftsGlance always maps 5 rows, `loggedCount=0`); no weigh-ins → `WidgetEmpty` "No weigh-ins" (Task 2); no target → net-delta fallback (Task 1 returns `deltaToTarget=null`, Task 2 secondary branch); single weigh-in → `ONE ENTRY`, dot only (Task 1 `netDelta=null`, Task 2 `spark.length < 2` skips polyline). ✓
- Testing: `bodyWeightSummary` TDD'd (Task 1, 7 cases incl. normalization); components verified by typecheck/lint/build per sibling convention; no `revalidatePath`. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; every command has expected output. ✓

**Type consistency:** `BodyWeightSummary` fields used in Task 2 (`latest`, `target`, `deltaToTarget`, `netDelta`, `towardTarget`, `count`, `spark`, `targetY`) match Task 1's definition exactly. `LiftRow` consumed in Task 3 matches the `lift-metrics.ts` definition. `bodyWeightSummary(metrics, targetWeight, today, days)` call in Task 4 matches Task 1's signature. `buildLiftRows(entries, today, weeks)` and `weekStart(date)` match `lift-metrics.ts`. ✓
