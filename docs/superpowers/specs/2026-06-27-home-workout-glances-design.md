# Home Workout Glances — Design

**Date:** 2026-06-27
**Status:** Approved, ready for implementation plan

## Goal

Add two read-only workout "glance" cards to the home command center
(`src/app/(app)/page.tsx`), extending the existing glance pattern established by
`ExpensesGlance` / `FocusGlance` / `PillsGlance`. The home page is a read-only
bridge that surfaces each domain's most important at-a-glance signal and links
out to the full surface. Workout currently has no presence there.

Each glance is a `WidgetCard` (from `src/components/today/WidgetCard.tsx`):
a Space-Mono bracket-label title, a hero metric, a compact mini-visualization,
and a quiet `→` link to the full surface. No emoji, no mutations.

## Components

### 1. `LiftsGlance` — this week's big-5

`src/components/home/LiftsGlance.tsx`

- **Title:** `[ LIFTS · THIS WEEK ]`, header-right link `GYM →` to `/workout`,
  `testid="home-lifts"`.
- **Hero:** `3 / 5 LOGGED` — the count of the five tracked lifts
  (bench / squat / deadlift / overhead_press / pull_ups) that have a
  current-week entry. The number turns `text-success` at `5 / 5`, mirroring the
  Pills `X / Y` all-done treatment. Uses the `font-doto` display numeral like
  the other glances.
- **Mini-viz:** five stacked rows, one per lift in `LIFTS` order. Each row:
  lift display name (mono caps) + a rep-proportional bar (width scaled to the
  max current rep count across logged lifts, min floor for visibility) + a
  trend glyph derived from `LiftRow.trend`:
  - `up` → `↑ +N` (`text-success`)
  - `down` → `↓ −N` (`text-accent`)
  - `flat` → `·`
  - `null` (no prior week) → `·`
  Unlogged lifts (`current == null`) render dim (`text-text-disabled`) with a
  `──` placeholder instead of a bar.
- **Empty state:** if zero lifts are logged this week, the hero still reads
  `0 / 5` and all five rows render dim. (No separate `WidgetEmpty` — the 0/5
  state is itself informative and consistent with the always-five-lifts model.)

**Data source — no new domain logic.** Reuses the existing, already-tested
`buildLiftRows(entries, today, weeks)` from `src/lib/utils/lift-metrics.ts`,
which returns per-lift `{ def, current, previous, trend, weightChanged, history }`.
The page computes:

```ts
const rows = buildLiftRows(liftEntries, today, 2) // 2 weeks: current + previous for trend
const loggedCount = rows.filter((r) => r.current != null).length
```

`LiftsGlance` receives `{ rows: LiftRow[]; loggedCount: number }` and only reads
`def.display`, `current?.reps`, `current != null`, and `trend?.dir` / `trend?.delta`.

### 2. `BodyWeightGlance` — weight → target

`src/components/home/BodyWeightGlance.tsx`

- **Title:** `[ BODY WEIGHT ]`, header-right link `GYM →` to `/workout`,
  `testid="home-bodyweight"`.
- **Hero:** latest weigh-in, e.g. `82.4 kg` (one decimal, `tabular-nums`).
- **Secondary line:**
  - **Target set:** the absolute distance with an explicit direction word —
    `2.4 KG ABOVE TARGET · 80.0` / `1.0 KG BELOW TARGET · 80.0` / `AT TARGET · 80.0`.
    The magnitude is `abs(latest − target)` and the word is chosen from the sign
    of `deltaToTarget = latest − target` (`> 0` → ABOVE, `< 0` → BELOW, `0` → AT).
    Colored `text-success` when the latest weigh-in is closer to target than the
    window's first weigh-in (`towardTarget === 'toward'`), `text-accent` when
    farther (`'away'`), `text-text-secondary` when flat or only one point —
    same progress semantics as `WeightTrendCard`.
  - **No target set (fallback):** net delta over the window,
    `▼ 1.2 KG · 90D` (`▲`/`▼`/`=`), `text-text-secondary`.
  - **Single weigh-in:** `ONE ENTRY`.
- **Mini-viz:** a compact 90-day SVG sparkline — a `polyline` of the normalized
  points plus a filled dot on the latest point, and a dashed horizontal target
  line when a target is set. Same stretched-`viewBox` + `vectorEffect`
  technique as `WeightTrendCard`, scaled down (~`h-16`).
- **Empty state:** no weigh-ins in the window → `WidgetEmpty` "No weigh-ins".

**Data source — one new pure helper.** `bodyWeightSummary` in
`src/lib/domain/home-overview.ts`:

```ts
export type BodyWeightSummary = {
  latest: number | null;          // latest weight in window, or null if none
  latestDate: string | null;
  target: number | null;
  deltaToTarget: number | null;   // latest - target, when both exist
  netDelta: number | null;        // latest - earliest, when >= 2 points
  towardTarget: 'toward' | 'away' | 'flat' | null; // progress vs target
  count: number;                  // number of non-null weigh-ins in window
  spark: { x: number; y: number }[]; // pre-normalized 0..100 sparkline points
  targetY: number | null;         // normalized y for the target line, 0..100
};

export function bodyWeightSummary(
  metrics: { date: string; weight_kg: number | null }[],
  targetWeight: number | null,
  today: string,
  days: number,
): BodyWeightSummary
```

Putting the y-range padding and x/y normalization in the helper (mirroring the
math already proven in `WeightTrendCard`) keeps the component dumb and makes the
math fully unit-testable. When a target is set it is included in the y-range
(as `WeightTrendCard` does) so the dashed target line always falls inside the
sparkline. The component only renders what the helper returns.

## Page wiring — `src/app/(app)/page.tsx`

1. Extend the existing `profiles` select to also fetch `target_weight_kg`
   (currently it selects `display_name, timezone`).
2. Add two queries to the existing `Promise.all`:
   - `weekly_lifts` — `id, exercise, week_start, weight_kg, reps`, filtered to
     `week_start >= addDays(weekStart(today), -7)` (current + previous week),
     for `user_id`.
   - `body_metrics` — `date, weight_kg`, last 90 days (`date >= addDays(today, -89)`),
     for `user_id`, weight ordering handled in the helper.
3. Map `weekly_lifts` rows to `LiftEntry[]` (coerce `weight_kg` to `number | null`,
   as the workout page already does), call `buildLiftRows(..., 2)`, derive
   `loggedCount`.
4. Call `bodyWeightSummary(bodyMetrics, targetWeight, today, 90)`.
5. Render both cards in the masonry grid, placed immediately after
   `PillsGlance`, so the column flow becomes:
   Goals · Spend · Deep-work · Pills · **Lifts · Weight** · Agenda.

`today` on the home page is the user-local date (`toUserDate(now, tz)`), which is
what the lift/weight helpers expect for "this week" / window math.

## Edge cases

| Case | Behavior |
| --- | --- |
| No lifts logged this week | Hero `0 / 5`, all five rows dim. |
| Lift logged this week but not last | `trend == null` → `·` glyph. |
| No weigh-ins in window | `BodyWeightGlance` shows `WidgetEmpty` "No weigh-ins". |
| No target weight set | Secondary line shows net 90-day delta; no dashed target line. |
| Single weigh-in | Sparkline = dot only (no polyline); secondary reads `ONE ENTRY`. |
| All weights equal | y-range padded so the flat line renders mid-card (same as `WeightTrendCard`). |

## Testing

- **TDD, helper first:** unit tests for `bodyWeightSummary` in
  `src/lib/domain/__tests__/home-overview.test.ts`:
  - target set, moving toward target → `towardTarget: 'toward'`, success-coloreable.
  - target set, moving away → `'away'`.
  - no target → `deltaToTarget: null`, `netDelta` populated.
  - empty window → `latest: null`, `count: 0`, `spark: []`.
  - single point → `netDelta: null`, `spark` has one point, no line.
  - sparkline normalization: x/y within `[0, 100]`, latest point at `x = 100`.
- `LiftsGlance` rides on the existing, passing `lift-metrics` test suite;
  `loggedCount` is a trivial `filter(...).length` derivation exercised by the
  page. No new test needed for it.
- Read-only surfaces — **no `revalidatePath`** work, no mutations.

## Non-goals / YAGNI

- No logging or editing from the home glances — they are read-only bridges.
- No new lift metrics, no schema changes, no new dependencies.
- No progress-photo glance on home (the photo signal stays on `/workout`).
- No configurability of which lifts appear — the big-5 set is fixed in
  `lift-metrics.ts`.

## Files

**New:**
- `src/components/home/LiftsGlance.tsx`
- `src/components/home/BodyWeightGlance.tsx`

**Modified:**
- `src/lib/domain/home-overview.ts` — add `bodyWeightSummary` + `BodyWeightSummary` type.
- `src/lib/domain/__tests__/home-overview.test.ts` — add `bodyWeightSummary` tests.
- `src/app/(app)/page.tsx` — queries + wiring + render.

**Reused (unchanged):**
- `src/lib/utils/lift-metrics.ts` — `buildLiftRows`, `weekStart`, `addDays`, `LIFTS`, `LiftRow`, `LiftEntry`.
- `src/components/today/WidgetCard.tsx` — `WidgetCard`, `WidgetEmpty`, `WidgetLink`.
