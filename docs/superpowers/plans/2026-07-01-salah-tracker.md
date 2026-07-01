# Salah Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a salah (five daily prayers) tracker — computed prayer times matched to the Tashkent Muftiyat, honest per-prayer status (on-time/late/qada/missed), jamaat tracking, streak/consistency, a `/salah` page, a home glance, and a settings section.

**Architecture:** A pure, unit-tested domain module (`src/lib/domain/salah.ts`) wraps the `adhan` library to compute prayer windows and classify logs; a `salah_logs` table (one row per prayer/day, real unique constraint) plus an optional `salah_settings` table hold data; server actions upsert logs; server components render the Nothing "instrument hero + masonry" UI. Prayer times are computed on read, never stored. All date math flows through the existing `toUserDate`/config timezone (Asia/Tashkent, GMT+5) — never UTC-today.

**Tech Stack:** Next.js 16.2.1 (App Router, React 19.2.4, React Compiler on), TypeScript (strict, `@/*` → `src/*`), Supabase (Postgres + RLS), `adhan` v4.4.4, `date-fns-tz` v3.2.0, Zod, Vitest, Tailwind v4 (Nothing tokens).

## Global Constraints

- **Next.js is non-standard (v16.2.1).** Per `AGENTS.md`, before writing any server-component / server-action / route code, read the relevant guide in `node_modules/next/dist/docs/`. APIs differ from training data.
- **Timezone rule.** Never compute "today" with `new Date().toISOString().split('T')[0]`. Use `toUserDate(now, tz)` and render instants only via `formatInTimeZone(instant, tz, 'HH:mm')` — never `.getHours()`/`.getMinutes()` (those read the server zone). `tz` comes from the salah config (`cfg.timezone`, default `'Asia/Tashkent'`, no DST).
- **RLS pattern (verified from `005_habit_logs.sql`).** User-owned tables reference `auth.users(id)`, and use **four separate policies** (`_select_own`/`_insert_own`/`_update_own`/`_delete_own`) with `auth.uid() = user_id`, NOT a single `FOR ALL`.
- **Next migration number: `022`.** Files: `supabase/migrations/NNN_snake_case.sql`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
- **After any migration:** apply it, then run `npm run db:reset && npm run db:types` (regenerates `src/lib/database.types.ts` from local Supabase). Also apply to the live project (dashboard SQL editor / Supabase MCP `apply_migration`) — and per the "DB objects not in migrations" caveat, introspect the live DB (`list_tables`) before applying to avoid clobbering dashboard-created objects.
- **Tashkent calc defaults (empirically fitted to islom.uz, NOT an official spec — keep user-tunable):** Fajr 15.5°, Isha 15.5°, Hanafi Asr, Maghrib offset +3 min, lat 41.2995, long 69.2401, `Asia/Tashkent`, no DST.
- **Design tokens (Nothing).** Cards use `WidgetCard` from `src/components/today/WidgetCard.tsx`. Fonts: `font-mono` (Space Mono) for labels, `font-doto` for big readouts. Status colors: on_time → `text-success`, late → `text-warning`, qada → `text-info`, missed → `text-text-disabled`.
- **TDD** for all pure domain logic. **No component unit tests** (repo convention — components are verified via `npm run typecheck`, `npm run lint`, and `npm run dev`; domain builders carry the tests). Commit after every task.
- **Deviation from spec, intentional:** all salah domain code (including `salahDaySummary`/`SalahDaySummary`) lives in `src/lib/domain/salah.ts` (not `home-overview.ts`) and all salah domain tests in `tests/unit/domain/salah.test.ts`. This keeps salah cohesive and prevents the `adhan` import from leaking into the shared `home-overview.ts`. Glance imports the summary **type only**.

---

## File Structure

**New:**
- `supabase/migrations/022_salah.sql` — tables, indexes, RLS.
- `src/lib/domain/salah.ts` — pure calc + classification + models + summary (the core).
- `tests/unit/domain/salah.test.ts` — all salah domain tests.
- `src/lib/schemas/salah.ts` — Zod schemas + inferred input types.
- `src/lib/data/salah.ts` — `loadSalahConfig` (row → `SalahCalcConfig`, fallback default).
- `src/lib/actions/salah.ts` — `logSalah`, `updateSalahLog`, `unlogSalah`, `updateSalahSettings`.
- `src/app/(app)/salah/page.tsx` — the `/salah` server component.
- `src/components/salah/SalahTodayInstrument.tsx` — hero (presentational).
- `src/components/salah/SalahLogCard.tsx` — client log controls (+ inline StatusPicker, JamaatToggle).
- `src/components/salah/SalahStreakCard.tsx` — streak + on-time% (presentational).
- `src/components/salah/SalahWeekGrid.tsx` — 5×7 status grid (presentational).
- `src/components/salah/SalahMonthCard.tsx` — 30-day rates (presentational).
- `src/components/salah/SalahTallyCard.tsx` — qada/missed counts (presentational).
- `src/components/salah/SalahSettingsForm.tsx` — client settings form.
- `src/components/home/SalahGlance.tsx` — home glance (presentational).

**Modified:**
- `package.json` / lockfile — add `adhan`.
- `src/app/(app)/page.tsx` — query + wire + render `SalahGlance`.
- `src/app/(app)/settings/page.tsx` — mount `SalahSettingsForm`.
- `src/components/layout/AppSidebar.tsx` — add `/salah` nav item.
- `src/lib/database.types.ts` — regenerated.

**Reused (unchanged):**
- `src/lib/domain/timezone.ts` — `toUserDate`, `userDayBounds`.
- `src/lib/domain/habit-consistency.ts` — `addDaysISO`.
- `src/components/today/WidgetCard.tsx` — `WidgetCard`, `WidgetEmpty`, `WidgetLink`, `WidgetCount`.
- `src/lib/supabase/{server,action}.ts`, `src/lib/auth/server-user.ts` — clients + `requireUserId`.

---

## Task 1: Migration + adhan dependency

**Files:**
- Create: `supabase/migrations/022_salah.sql`
- Modify: `package.json` (via `npm install`)
- Modify: `src/lib/database.types.ts` (regenerated)

**Interfaces:**
- Produces: tables `public.salah_logs` and `public.salah_settings`; the `adhan` package available for import.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/022_salah.sql`:

```sql
-- 022_salah.sql
-- Salah (five daily prayers) tracker. Follows the habit_logs pattern:
-- references auth.users(id), split RLS policies, log_date derived server-side.
--
-- salah_logs: one row per prayer per day (real unique constraint, unlike
-- habit_logs). Stored statuses are on_time|late|qada; "missed" is derived
-- from the absence of a row for a prayer whose window has passed.
-- salah_settings: optional per-user calc config. If absent, code falls back
-- to TASHKENT_DEFAULT, so no trigger/auto-seed is needed.

CREATE TABLE IF NOT EXISTS public.salah_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prayer     TEXT NOT NULL CHECK (prayer IN ('fajr','dhuhr','asr','maghrib','isha')),
  log_date   DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('on_time','late','qada')),
  jamaat     TEXT CHECK (jamaat IN ('alone','jamaat','masjid')),
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, prayer, log_date)
);

CREATE INDEX IF NOT EXISTS idx_salah_logs_user_date
  ON public.salah_logs (user_id, log_date DESC);

ALTER TABLE public.salah_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salah_logs_select_own" ON public.salah_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "salah_logs_insert_own" ON public.salah_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salah_logs_update_own" ON public.salah_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salah_logs_delete_own" ON public.salah_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.salah_settings (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  city                TEXT    NOT NULL DEFAULT 'Tashkent',
  latitude            NUMERIC NOT NULL DEFAULT 41.2995,
  longitude           NUMERIC NOT NULL DEFAULT 69.2401,
  timezone            TEXT    NOT NULL DEFAULT 'Asia/Tashkent',
  fajr_angle          NUMERIC NOT NULL DEFAULT 15.5,
  isha_angle          NUMERIC NOT NULL DEFAULT 15.5,
  isha_interval       INTEGER NOT NULL DEFAULT 0,
  madhab              TEXT    NOT NULL DEFAULT 'hanafi' CHECK (madhab IN ('hanafi','shafi')),
  offset_fajr         INTEGER NOT NULL DEFAULT 0,
  offset_dhuhr        INTEGER NOT NULL DEFAULT 0,
  offset_asr          INTEGER NOT NULL DEFAULT 0,
  offset_maghrib      INTEGER NOT NULL DEFAULT 3,
  offset_isha         INTEGER NOT NULL DEFAULT 0,
  late_after_fraction NUMERIC NOT NULL DEFAULT 0.6667
    CHECK (late_after_fraction >= 0 AND late_after_fraction <= 1),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salah_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salah_settings_select_own" ON public.salah_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "salah_settings_insert_own" ON public.salah_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salah_settings_update_own" ON public.salah_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salah_settings_delete_own" ON public.salah_settings
  FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Install adhan**

Run: `npm install adhan`
Expected: `package.json` gains `"adhan": "^4.4.4"` (or current 4.x); no peer-dep errors (adhan has zero runtime deps).

- [ ] **Step 3: Apply the migration locally and regenerate types**

Run: `npm run db:reset && npm run db:types`
Expected: local Supabase re-applies all migrations including `022`; `src/lib/database.types.ts` regenerates and now contains `salah_logs` and `salah_settings`.
Verify: `grep -c salah_logs src/lib/database.types.ts` returns ≥ 1.

(If `npm run db:reset` is unavailable in the environment, apply `022_salah.sql` to the live project via the Supabase dashboard SQL editor or the Supabase MCP `apply_migration` tool after `list_tables`, then still run `npm run db:types` against the linked project.)

- [ ] **Step 4: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: PASS (no salah code yet; this confirms the regenerated types compile).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/022_salah.sql package.json package-lock.json src/lib/database.types.ts
git commit -m "feat(salah): add salah_logs + salah_settings migration and adhan dep"
```

---

## Task 2: Domain — config + prayer-time computation (TDD)

**Files:**
- Create: `src/lib/domain/salah.ts`
- Test: `tests/unit/domain/salah.test.ts`

**Interfaces:**
- Consumes: `adhan` (`Coordinates`, `CalculationParameters`, `PrayerTimes`, `Madhab`); `addDaysISO` from `@/lib/domain/habit-consistency`.
- Produces: `PRAYERS`, `PRAYER_LABELS`, types `PrayerName`/`SalahStatus`/`JamaatKind`/`Madhab`/`PrayerOffsets`/`SalahCalcConfig`, `TASHKENT_DEFAULT`, `buildParams(cfg)`, `prayerTimesForDay(localYmd, cfg): Record<PrayerName, Date>`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/domain/salah.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import {
  TASHKENT_DEFAULT,
  prayerTimesForDay,
  type SalahCalcConfig,
} from '@/lib/domain/salah';

const TZ = 'Asia/Tashkent';

/** Absolute minute-of-day for an instant, rendered in tz. */
function minsInTz(d: Date): number {
  const [h, m] = formatInTimeZone(d, TZ, 'HH:mm').split(':').map(Number);
  return h * 60 + m;
}
/** Assert an instant renders within `tol` minutes of an 'HH:mm' target. */
function assertClose(d: Date, target: string, tol = 3) {
  const [th, tm] = target.split(':').map(Number);
  expect(Math.abs(minsInTz(d) - (th * 60 + tm))).toBeLessThanOrEqual(tol);
}

describe('prayerTimesForDay — Tashkent Muftiyat fixtures', () => {
  // Official islom.uz Fajr/Isha, reproduced by 15.5°/15.5° + Hanafi + Maghrib+3.
  const cases: Array<[string, string, string]> = [
    ['2026-07-01', '03:09', '21:45'],
    ['2026-03-21', '05:06', '19:55'],
    ['2026-06-21', '03:04', '21:46'],
    ['2026-09-23', '04:52', '19:38'],
    ['2026-12-21', '06:19', '18:23'],
  ];
  it.each(cases)('%s → Fajr %s / Isha %s (±3m)', (date, fajr, isha) => {
    const t = prayerTimesForDay(date, TASHKENT_DEFAULT);
    assertClose(t.fajr, fajr);
    assertClose(t.isha, isha);
  });
});

describe('prayerTimesForDay — madhab and offsets', () => {
  it('Hanafi Asr is later than Shafi Asr', () => {
    const hanafi = prayerTimesForDay('2026-07-01', TASHKENT_DEFAULT);
    const shafi = prayerTimesForDay('2026-07-01', {
      ...TASHKENT_DEFAULT,
      madhab: 'shafi',
    });
    expect(hanafi.asr.getTime()).toBeGreaterThan(shafi.asr.getTime());
  });

  it('maghrib offset shifts maghrib by exactly the configured minutes', () => {
    const withOffset = prayerTimesForDay('2026-07-01', TASHKENT_DEFAULT); // +3
    const noOffset = prayerTimesForDay('2026-07-01', {
      ...TASHKENT_DEFAULT,
      offsets: { ...TASHKENT_DEFAULT.offsets, maghrib: 0 },
    });
    const diffMin =
      (withOffset.maghrib.getTime() - noOffset.maghrib.getTime()) / 60000;
    expect(diffMin).toBe(3);
  });

  it('returns all five prayers as Date instants', () => {
    const t = prayerTimesForDay('2026-07-01', TASHKENT_DEFAULT);
    for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      expect(t[p]).toBeInstanceOf(Date);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- salah`
Expected: FAIL — `Cannot find module '@/lib/domain/salah'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/domain/salah.ts`:

```ts
import { Coordinates, CalculationParameters, PrayerTimes, Madhab } from 'adhan';
import { addDaysISO } from '@/lib/domain/habit-consistency';

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = (typeof PRAYERS)[number];

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export type SalahStatus = 'on_time' | 'late' | 'qada';
export type JamaatKind = 'alone' | 'jamaat' | 'masjid';
export type SalahMadhab = 'hanafi' | 'shafi';

export type PrayerOffsets = {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};

export type SalahCalcConfig = {
  latitude: number;
  longitude: number;
  timezone: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaInterval: number;
  madhab: SalahMadhab;
  offsets: PrayerOffsets;
  lateAfterFraction: number; // 0..1; start of "late" as fraction of window
};

export const TASHKENT_DEFAULT: SalahCalcConfig = {
  latitude: 41.2995,
  longitude: 69.2401,
  timezone: 'Asia/Tashkent',
  fajrAngle: 15.5,
  ishaAngle: 15.5,
  ishaInterval: 0,
  madhab: 'hanafi',
  offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 3, isha: 0 },
  lateAfterFraction: 2 / 3,
};

/** adhan CalculationParameters for a config. User offsets go in `adjustments`. */
export function buildParams(cfg: SalahCalcConfig): CalculationParameters {
  const p = new CalculationParameters('Other', cfg.fajrAngle, cfg.ishaAngle);
  if (cfg.ishaInterval > 0) p.ishaInterval = cfg.ishaInterval;
  p.madhab = cfg.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  p.adjustments.fajr = cfg.offsets.fajr;
  p.adjustments.dhuhr = cfg.offsets.dhuhr;
  p.adjustments.asr = cfg.offsets.asr;
  p.adjustments.maghrib = cfg.offsets.maghrib;
  p.adjustments.isha = cfg.offsets.isha;
  return p;
}

/**
 * The five prayer START instants (absolute UTC) for a Tashkent-local calendar
 * day. adhan reads only Y/M/D from the Date via LOCAL getters, so constructing
 * `new Date(y, m-1, d)` round-trips correctly on any server timezone.
 */
export function prayerTimesForDay(
  localYmd: string,
  cfg: SalahCalcConfig,
): Record<PrayerName, Date> {
  const [y, m, d] = localYmd.split('-').map(Number);
  const coords = new Coordinates(cfg.latitude, cfg.longitude);
  const pt = new PrayerTimes(coords, new Date(y, m - 1, d), buildParams(cfg));
  return {
    fajr: pt.fajr,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- salah`
Expected: PASS (all fixtures within ±3 min; Hanafi Asr later; Maghrib +3).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/salah.ts tests/unit/domain/salah.test.ts
git commit -m "feat(salah): prayer-time computation matched to Tashkent Muftiyat"
```

---

## Task 3: Domain — windows + status classification (TDD)

**Files:**
- Modify: `src/lib/domain/salah.ts`
- Test: `tests/unit/domain/salah.test.ts`

**Interfaces:**
- Consumes: `prayerTimesForDay`, `addDaysISO`.
- Produces: type `PrayerWindow = { start: Date; end: Date }`; `prayerWindowsForDay(localYmd, cfg): Record<PrayerName, PrayerWindow>`; `classifyLog(loggedAt, w, lateAfterFraction): SalahStatus`; `suggestStatus(now, w, lateAfterFraction): SalahStatus`; `isMissed(now, w, hasLog): boolean`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/domain/salah.test.ts`:

```ts
import {
  prayerWindowsForDay,
  classifyLog,
  isMissed,
  type PrayerWindow,
} from '@/lib/domain/salah';

describe('prayerWindowsForDay', () => {
  it('windows are contiguous; isha ends at tomorrow fajr', () => {
    const w = prayerWindowsForDay('2026-07-01', TASHKENT_DEFAULT);
    expect(w.fajr.end.getTime()).toBe(w.dhuhr.start.getTime());
    expect(w.dhuhr.end.getTime()).toBe(w.asr.start.getTime());
    expect(w.asr.end.getTime()).toBe(w.maghrib.start.getTime());
    expect(w.maghrib.end.getTime()).toBe(w.isha.start.getTime());
    const tomorrowFajr = prayerTimesForDay('2026-07-02', TASHKENT_DEFAULT).fajr;
    expect(w.isha.end.getTime()).toBe(tomorrowFajr.getTime());
  });
});

describe('classifyLog / isMissed', () => {
  const w: PrayerWindow = {
    start: new Date('2026-07-01T00:00:00Z'),
    end: new Date('2026-07-01T03:00:00Z'), // 3h window; late threshold at 2h (2/3)
  };
  const f = 2 / 3;

  it('first two-thirds of the window is on_time', () => {
    expect(classifyLog(new Date('2026-07-01T00:30:00Z'), w, f)).toBe('on_time');
    expect(classifyLog(new Date('2026-07-01T01:59:00Z'), w, f)).toBe('on_time');
  });
  it('last third of the window is late', () => {
    expect(classifyLog(new Date('2026-07-01T02:00:00Z'), w, f)).toBe('late');
    expect(classifyLog(new Date('2026-07-01T02:59:00Z'), w, f)).toBe('late');
  });
  it('at/after end, or before start, is qada', () => {
    expect(classifyLog(new Date('2026-07-01T03:00:00Z'), w, f)).toBe('qada');
    expect(classifyLog(new Date('2026-06-30T23:59:00Z'), w, f)).toBe('qada');
  });
  it('isMissed only when no log and the window has fully passed', () => {
    expect(isMissed(new Date('2026-07-01T03:00:00Z'), w, false)).toBe(true);
    expect(isMissed(new Date('2026-07-01T03:00:00Z'), w, true)).toBe(false);
    expect(isMissed(new Date('2026-07-01T02:59:00Z'), w, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- salah`
Expected: FAIL — `prayerWindowsForDay`/`classifyLog`/`isMissed` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/domain/salah.ts`:

```ts
export type PrayerWindow = { start: Date; end: Date };

/** Per-prayer window [start, nextStart). Isha ends at tomorrow's Fajr. */
export function prayerWindowsForDay(
  localYmd: string,
  cfg: SalahCalcConfig,
): Record<PrayerName, PrayerWindow> {
  const t = prayerTimesForDay(localYmd, cfg);
  const tomorrow = prayerTimesForDay(addDaysISO(localYmd, 1), cfg);
  return {
    fajr: { start: t.fajr, end: t.dhuhr },
    dhuhr: { start: t.dhuhr, end: t.asr },
    asr: { start: t.asr, end: t.maghrib },
    maghrib: { start: t.maghrib, end: t.isha },
    isha: { start: t.isha, end: tomorrow.fajr },
  };
}

/**
 * on_time = first `lateAfterFraction` of the window; late = the tail; qada =
 * at/after end or before start (a log with no active window is a make-up).
 */
export function classifyLog(
  loggedAt: Date,
  w: PrayerWindow,
  lateAfterFraction: number,
): SalahStatus {
  const t = loggedAt.getTime();
  const s = w.start.getTime();
  const e = w.end.getTime();
  if (t < s || t >= e) return 'qada';
  const threshold = s + (e - s) * lateAfterFraction;
  return t >= threshold ? 'late' : 'on_time';
}

/** Suggested status for a fresh tap = classify "now" against the window. */
export function suggestStatus(
  now: Date,
  w: PrayerWindow,
  lateAfterFraction: number,
): SalahStatus {
  return classifyLog(now, w, lateAfterFraction);
}

/** A prayer is missed when no log exists and its window has fully passed. */
export function isMissed(now: Date, w: PrayerWindow, hasLog: boolean): boolean {
  return !hasLog && now.getTime() >= w.end.getTime();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- salah`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/salah.ts tests/unit/domain/salah.test.ts
git commit -m "feat(salah): prayer windows and status classification"
```

---

## Task 4: Domain — day model, consistency, day summary (TDD)

**Files:**
- Modify: `src/lib/domain/salah.ts`
- Test: `tests/unit/domain/salah.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–3; `toUserDate` from `@/lib/domain/timezone`; `formatInTimeZone` from `date-fns-tz`; `addDaysISO`.
- Produces:
  - `LoggedPrayer = { prayer: PrayerName; status: SalahStatus; jamaat: JamaatKind | null }`
  - `PrayerCellState = 'prayed' | 'current' | 'upcoming' | 'missed'`
  - `PrayerCell = { name; label; start; end; state; status; jamaat }`
  - `NextPrayer = { name: PrayerName; at: Date; isTomorrow: boolean }`
  - `DayModel = { date: string; cells: PrayerCell[]; next: NextPrayer | null }`
  - `buildDayModel(now, cfg, todaysLogs): DayModel`
  - `WeekCellStatus = SalahStatus | 'missed' | 'pending'`
  - `WeekDay = { date; isToday; prayers: { name: PrayerName; status: WeekCellStatus }[] }`
  - `SalahConsistency = { streakCurrent; streakLongest; onTimeRate30d; jamaatRate30d; qadaCount30d; missedCount30d; totalLogged30d; week: WeekDay[] }`
  - `buildSalahConsistency(logsByDate, today, now, cfg): SalahConsistency`
  - `SalahDaySummary = { prayedCount; nextLabel; nextAt; streakCurrent; onTimeRate7d }`
  - `salahDaySummary(cfg, todaysLogs, logsByDate, now, today): SalahDaySummary`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/domain/salah.test.ts`:

```ts
import {
  buildDayModel,
  buildSalahConsistency,
  salahDaySummary,
  type LoggedPrayer,
} from '@/lib/domain/salah';

const full = (): LoggedPrayer[] =>
  (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((prayer) => ({
    prayer,
    status: 'on_time' as const,
    jamaat: 'masjid' as const,
  }));

describe('buildDayModel', () => {
  it('marks logged prayers prayed and derives states for the rest', () => {
    // 2026-07-01 09:00 UTC = 14:00 Tashkent: Fajr/Dhuhr passed, Asr around now.
    const now = new Date('2026-07-01T09:00:00Z');
    const logs: LoggedPrayer[] = [
      { prayer: 'fajr', status: 'on_time', jamaat: 'masjid' },
    ];
    const m = buildDayModel(now, TASHKENT_DEFAULT, logs);
    expect(m.date).toBe('2026-07-01');
    expect(m.cells).toHaveLength(5);
    const fajr = m.cells.find((c) => c.name === 'fajr')!;
    expect(fajr.state).toBe('prayed');
    expect(fajr.status).toBe('on_time');
    // Dhuhr window passed with no log → missed.
    expect(m.cells.find((c) => c.name === 'dhuhr')!.state).toBe('missed');
    // Isha is still upcoming this evening.
    expect(m.cells.find((c) => c.name === 'isha')!.state).toBe('upcoming');
  });

  it("labels Friday's Dhuhr as Jumu'ah", () => {
    // 2026-01-02 is a Friday.
    const fri = buildDayModel(new Date('2026-01-02T06:00:00Z'), TASHKENT_DEFAULT, []);
    expect(fri.cells.find((c) => c.name === 'dhuhr')!.label).toBe("Jumu'ah");
    // 2026-01-03 is a Saturday.
    const sat = buildDayModel(new Date('2026-01-03T06:00:00Z'), TASHKENT_DEFAULT, []);
    expect(sat.cells.find((c) => c.name === 'dhuhr')!.label).toBe('Dhuhr');
  });

  it('after Isha, next is tomorrow Fajr', () => {
    // 2026-07-01 18:00 UTC = 23:00 Tashkent, after Isha (~21:45).
    const m = buildDayModel(new Date('2026-07-01T18:00:00Z'), TASHKENT_DEFAULT, []);
    expect(m.next?.name).toBe('fajr');
    expect(m.next?.isTomorrow).toBe(true);
  });
});

describe('buildSalahConsistency', () => {
  const today = '2026-07-01';
  const now = new Date('2026-07-01T18:00:00Z'); // all of today's windows passed
  it('counts a perfect-day streak and 7-day week', () => {
    const byDate = new Map<string, LoggedPrayer[]>();
    for (const d of ['2026-06-29', '2026-06-30', '2026-07-01']) byDate.set(d, full());
    const c = buildSalahConsistency(byDate, today, now, TASHKENT_DEFAULT);
    expect(c.streakCurrent).toBe(3);
    expect(c.week).toHaveLength(7);
    expect(c.onTimeRate30d).toBe(1);
    expect(c.jamaatRate30d).toBe(1);
  });

  it('reports missed prayers for empty past days', () => {
    const c = buildSalahConsistency(new Map(), today, now, TASHKENT_DEFAULT);
    expect(c.streakCurrent).toBe(0);
    expect(c.missedCount30d).toBeGreaterThan(0);
    expect(c.qadaCount30d).toBe(0);
  });
});

describe('salahDaySummary', () => {
  it('summarizes today for the home glance', () => {
    const byDate = new Map<string, LoggedPrayer[]>([['2026-07-01', full()]]);
    const s = salahDaySummary(
      TASHKENT_DEFAULT,
      full(),
      byDate,
      new Date('2026-07-01T18:00:00Z'),
      '2026-07-01',
    );
    expect(s.prayedCount).toBe(5);
    expect(s.onTimeRate7d).toBe(1);
    expect(s.nextLabel).toBe('Fajr'); // after Isha → tomorrow Fajr
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- salah`
Expected: FAIL — `buildDayModel`/`buildSalahConsistency`/`salahDaySummary` not exported.

- [ ] **Step 3: Write minimal implementation**

Add imports at the top of `src/lib/domain/salah.ts` (merge with the existing import lines):

```ts
import { toUserDate } from '@/lib/domain/timezone';
import { formatInTimeZone } from 'date-fns-tz';
```

Append to `src/lib/domain/salah.ts`:

```ts
export type LoggedPrayer = {
  prayer: PrayerName;
  status: SalahStatus;
  jamaat: JamaatKind | null;
};

export type PrayerCellState = 'prayed' | 'current' | 'upcoming' | 'missed';

export type PrayerCell = {
  name: PrayerName;
  label: string;
  start: Date;
  end: Date;
  state: PrayerCellState;
  status: SalahStatus | null;
  jamaat: JamaatKind | null;
};

export type NextPrayer = { name: PrayerName; at: Date; isTomorrow: boolean };

export type DayModel = {
  date: string;
  cells: PrayerCell[];
  next: NextPrayer | null;
};

/** Today's five prayers with per-prayer state, plus the next upcoming prayer. */
export function buildDayModel(
  now: Date,
  cfg: SalahCalcConfig,
  todaysLogs: LoggedPrayer[],
): DayModel {
  const date = toUserDate(now, cfg.timezone);
  const windows = prayerWindowsForDay(date, cfg);
  const isFriday = formatInTimeZone(windows.dhuhr.start, cfg.timezone, 'EEEE') === 'Friday';
  const t = now.getTime();

  const cells: PrayerCell[] = PRAYERS.map((name) => {
    const w = windows[name];
    const log = todaysLogs.find((l) => l.prayer === name) ?? null;
    let state: PrayerCellState;
    if (log) state = 'prayed';
    else if (t >= w.end.getTime()) state = 'missed';
    else if (t >= w.start.getTime()) state = 'current';
    else state = 'upcoming';
    const label = name === 'dhuhr' && isFriday ? "Jumu'ah" : PRAYER_LABELS[name];
    return {
      name,
      label,
      start: w.start,
      end: w.end,
      state,
      status: log?.status ?? null,
      jamaat: log?.jamaat ?? null,
    };
  });

  // Next = first prayer whose window has not started yet; else tomorrow's Fajr.
  let next: NextPrayer | null = null;
  for (const name of PRAYERS) {
    if (windows[name].start.getTime() > t) {
      next = { name, at: windows[name].start, isTomorrow: false };
      break;
    }
  }
  if (!next) {
    const tomorrowFajr = prayerTimesForDay(addDaysISO(date, 1), cfg).fajr;
    next = { name: 'fajr', at: tomorrowFajr, isTomorrow: true };
  }

  return { date, cells, next };
}

export type WeekCellStatus = SalahStatus | 'missed' | 'pending';
export type WeekDay = {
  date: string;
  isToday: boolean;
  prayers: { name: PrayerName; status: WeekCellStatus }[];
};

export type SalahConsistency = {
  streakCurrent: number;
  streakLongest: number;
  onTimeRate30d: number;
  jamaatRate30d: number;
  qadaCount30d: number;
  missedCount30d: number;
  totalLogged30d: number;
  week: WeekDay[];
};

function isPerfectDay(logsByDate: Map<string, LoggedPrayer[]>, date: string): boolean {
  return (logsByDate.get(date)?.length ?? 0) >= PRAYERS.length;
}

/** Streak/quality metrics over a trailing 30-day window ending at `today`. */
export function buildSalahConsistency(
  logsByDate: Map<string, LoggedPrayer[]>,
  today: string,
  now: Date,
  cfg: SalahCalcConfig,
): SalahConsistency {
  // Current streak: consecutive perfect days ending today (or yesterday if
  // today is not yet complete).
  let streakCurrent = 0;
  let cursor = isPerfectDay(logsByDate, today) ? today : addDaysISO(today, -1);
  while (isPerfectDay(logsByDate, cursor)) {
    streakCurrent++;
    cursor = addDaysISO(cursor, -1);
  }

  // Longest streak + 30-day quality metrics + missed derivation.
  let streakLongest = 0;
  let run = 0;
  let onTime = 0;
  let jamaat = 0;
  let qada = 0;
  let missed = 0;
  let totalLogged = 0;
  const t = now.getTime();

  for (let i = 29; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    if (isPerfectDay(logsByDate, date)) {
      run++;
      streakLongest = Math.max(streakLongest, run);
    } else {
      run = 0;
    }
    const logs = logsByDate.get(date) ?? [];
    const windows = prayerWindowsForDay(date, cfg);
    for (const name of PRAYERS) {
      const log = logs.find((l) => l.prayer === name);
      if (log) {
        totalLogged++;
        if (log.status === 'on_time') onTime++;
        if (log.status === 'qada') qada++;
        if (log.jamaat === 'jamaat' || log.jamaat === 'masjid') jamaat++;
      } else if (t >= windows[name].end.getTime()) {
        missed++;
      }
    }
  }

  // Trailing 7-day per-prayer grid (oldest → newest).
  const week: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    const logs = logsByDate.get(date) ?? [];
    const windows = prayerWindowsForDay(date, cfg);
    const prayers = PRAYERS.map((name) => {
      const log = logs.find((l) => l.prayer === name);
      let status: WeekCellStatus;
      if (log) status = log.status;
      else if (t >= windows[name].end.getTime()) status = 'missed';
      else status = 'pending';
      return { name, status };
    });
    week.push({ date, isToday: date === today, prayers });
  }

  return {
    streakCurrent,
    streakLongest,
    onTimeRate30d: totalLogged ? onTime / totalLogged : 0,
    jamaatRate30d: totalLogged ? jamaat / totalLogged : 0,
    qadaCount30d: qada,
    missedCount30d: missed,
    totalLogged30d: totalLogged,
    week,
  };
}

export type SalahDaySummary = {
  prayedCount: number;
  nextLabel: string | null;
  nextAt: string | null; // 'HH:mm' in cfg.timezone
  streakCurrent: number;
  onTimeRate7d: number;
};

/** Compact summary for the home glance. `today` is the user-local date. */
export function salahDaySummary(
  cfg: SalahCalcConfig,
  todaysLogs: LoggedPrayer[],
  logsByDate: Map<string, LoggedPrayer[]>,
  now: Date,
  today: string,
): SalahDaySummary {
  const model = buildDayModel(now, cfg, todaysLogs);
  const prayedCount = model.cells.filter((c) => c.state === 'prayed').length;

  let on = 0;
  let tot = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDaysISO(today, -i);
    for (const l of logsByDate.get(date) ?? []) {
      tot++;
      if (l.status === 'on_time') on++;
    }
  }

  const consistency = buildSalahConsistency(logsByDate, today, now, cfg);
  return {
    prayedCount,
    nextLabel: model.next ? PRAYER_LABELS[model.next.name] : null,
    nextAt: model.next ? formatInTimeZone(model.next.at, cfg.timezone, 'HH:mm') : null,
    streakCurrent: consistency.streakCurrent,
    onTimeRate7d: tot ? on / tot : 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- salah`
Expected: PASS (all salah domain tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/salah.ts tests/unit/domain/salah.test.ts
git commit -m "feat(salah): day model, consistency metrics, and day summary"
```

---

## Task 5: Schemas + data-access + server actions

**Files:**
- Create: `src/lib/schemas/salah.ts`
- Create: `src/lib/data/salah.ts`
- Create: `src/lib/actions/salah.ts`
- Test: `tests/unit/domain/salah.test.ts` (append schema tests)

**Interfaces:**
- Consumes: domain types/functions from Task 2–4; `createClient` from `@/lib/supabase/action`; `toUserDate`.
- Produces:
  - Schemas: `LogSalahSchema`, `UpdateSalahLogSchema`, `UnlogSalahSchema`, `SalahSettingsSchema` + inferred `*Input` types; `SalahStatusSchema`, `JamaatKindSchema`, `PrayerNameSchema`.
  - `loadSalahConfig(supabase, userId): Promise<SalahCalcConfig>`.
  - Actions: `logSalah`, `updateSalahLog`, `unlogSalah`, `updateSalahSettings`.

- [ ] **Step 1: Write the failing schema test**

Append to `tests/unit/domain/salah.test.ts`:

```ts
import {
  LogSalahSchema,
  SalahSettingsSchema,
} from '@/lib/schemas/salah';

describe('salah schemas', () => {
  it('accepts a minimal log (prayer only)', () => {
    const r = LogSalahSchema.parse({ prayer: 'fajr' });
    expect(r.prayer).toBe('fajr');
  });
  it('rejects an unknown prayer', () => {
    expect(() => LogSalahSchema.parse({ prayer: 'witr' })).toThrow();
  });
  it('rejects an out-of-range late_after_fraction', () => {
    const base = {
      city: 'Tashkent', latitude: 41.3, longitude: 69.2, timezone: 'Asia/Tashkent',
      fajr_angle: 15.5, isha_angle: 15.5, isha_interval: 0, madhab: 'hanafi',
      offset_fajr: 0, offset_dhuhr: 0, offset_asr: 0, offset_maghrib: 3, offset_isha: 0,
    };
    expect(() => SalahSettingsSchema.parse({ ...base, late_after_fraction: 2 })).toThrow();
    expect(SalahSettingsSchema.parse({ ...base, late_after_fraction: 0.6667 }).madhab).toBe('hanafi');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- salah`
Expected: FAIL — `Cannot find module '@/lib/schemas/salah'`.

- [ ] **Step 3: Write the schemas**

Create `src/lib/schemas/salah.ts`:

```ts
import { z } from 'zod';

export const PrayerNameSchema = z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
export const SalahStatusSchema = z.enum(['on_time', 'late', 'qada']);
export const JamaatKindSchema = z.enum(['alone', 'jamaat', 'masjid']);

/** Log or upsert a prayer. `log_date`/`status` default server-side. */
export const LogSalahSchema = z.object({
  prayer: PrayerNameSchema,
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: SalahStatusSchema.optional(),
  jamaat: JamaatKindSchema.nullable().optional(),
});
export type LogSalahInput = z.infer<typeof LogSalahSchema>;

export const UpdateSalahLogSchema = z.object({
  prayer: PrayerNameSchema,
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: SalahStatusSchema.optional(),
  jamaat: JamaatKindSchema.nullable().optional(),
});
export type UpdateSalahLogInput = z.infer<typeof UpdateSalahLogSchema>;

export const UnlogSalahSchema = z.object({
  prayer: PrayerNameSchema,
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type UnlogSalahInput = z.infer<typeof UnlogSalahSchema>;

export const SalahSettingsSchema = z.object({
  city: z.string().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1).max(64),
  fajr_angle: z.number().min(0).max(30),
  isha_angle: z.number().min(0).max(30),
  isha_interval: z.number().int().min(0).max(180),
  madhab: z.enum(['hanafi', 'shafi']),
  offset_fajr: z.number().int().min(-60).max(60),
  offset_dhuhr: z.number().int().min(-60).max(60),
  offset_asr: z.number().int().min(-60).max(60),
  offset_maghrib: z.number().int().min(-60).max(60),
  offset_isha: z.number().int().min(-60).max(60),
  late_after_fraction: z.number().min(0).max(1),
});
export type SalahSettingsInput = z.infer<typeof SalahSettingsSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- salah`
Expected: PASS.

- [ ] **Step 5: Write the data-access helper**

Create `src/lib/data/salah.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { TASHKENT_DEFAULT, type SalahCalcConfig } from '@/lib/domain/salah';

type SettingsRow = {
  latitude: number | string;
  longitude: number | string;
  timezone: string;
  fajr_angle: number | string;
  isha_angle: number | string;
  isha_interval: number;
  madhab: 'hanafi' | 'shafi';
  offset_fajr: number;
  offset_dhuhr: number;
  offset_asr: number;
  offset_maghrib: number;
  offset_isha: number;
  late_after_fraction: number | string;
};

/** Load a user's salah calc config, falling back to TASHKENT_DEFAULT. */
export async function loadSalahConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<SalahCalcConfig> {
  const { data } = await supabase
    .from('salah_settings')
    .select(
      'latitude, longitude, timezone, fajr_angle, isha_angle, isha_interval, madhab, offset_fajr, offset_dhuhr, offset_asr, offset_maghrib, offset_isha, late_after_fraction',
    )
    .eq('user_id', userId)
    .maybeSingle();

  const row = data as SettingsRow | null;
  if (!row) return TASHKENT_DEFAULT;

  return {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    timezone: row.timezone,
    fajrAngle: Number(row.fajr_angle),
    ishaAngle: Number(row.isha_angle),
    ishaInterval: row.isha_interval,
    madhab: row.madhab,
    offsets: {
      fajr: row.offset_fajr,
      dhuhr: row.offset_dhuhr,
      asr: row.offset_asr,
      maghrib: row.offset_maghrib,
      isha: row.offset_isha,
    },
    lateAfterFraction: Number(row.late_after_fraction),
  };
}
```

- [ ] **Step 6: Write the server actions**

Create `src/lib/actions/salah.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/action';
import { toUserDate } from '@/lib/domain/timezone';
import { loadSalahConfig } from '@/lib/data/salah';
import { prayerWindowsForDay, suggestStatus } from '@/lib/domain/salah';
import {
  LogSalahSchema,
  UpdateSalahLogSchema,
  UnlogSalahSchema,
  SalahSettingsSchema,
  type LogSalahInput,
  type UpdateSalahLogInput,
  type UnlogSalahInput,
  type SalahSettingsInput,
} from '@/lib/schemas/salah';

async function authedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return { supabase, user };
}

/** Log (or upsert) a prayer. log_date + status default server-side. */
export async function logSalah(input: LogSalahInput) {
  const parsed = LogSalahSchema.parse(input);
  const { supabase, user } = await authedClient();
  const cfg = await loadSalahConfig(supabase, user.id);

  const now = new Date();
  const log_date = parsed.log_date ?? toUserDate(now, cfg.timezone);

  let status = parsed.status;
  if (!status) {
    const windows = prayerWindowsForDay(log_date, cfg);
    status = suggestStatus(now, windows[parsed.prayer], cfg.lateAfterFraction);
  }

  const { data, error } = await supabase
    .from('salah_logs')
    .upsert(
      {
        user_id: user.id,
        prayer: parsed.prayer,
        log_date,
        status,
        jamaat: parsed.jamaat ?? null,
        logged_at: now.toISOString(),
      },
      { onConflict: 'user_id,prayer,log_date' },
    )
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/salah');
  revalidatePath('/');
  return data;
}

/** Update an existing prayer's status and/or jamaat. */
export async function updateSalahLog(input: UpdateSalahLogInput) {
  const parsed = UpdateSalahLogSchema.parse(input);
  const { supabase, user } = await authedClient();

  const patch: Record<string, unknown> = {};
  if (parsed.status !== undefined) patch.status = parsed.status;
  if (parsed.jamaat !== undefined) patch.jamaat = parsed.jamaat;

  const { data, error } = await supabase
    .from('salah_logs')
    .update(patch)
    .eq('user_id', user.id)
    .eq('prayer', parsed.prayer)
    .eq('log_date', parsed.log_date)
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/salah');
  revalidatePath('/');
  return data;
}

/** Remove a prayer log. */
export async function unlogSalah(input: UnlogSalahInput) {
  const parsed = UnlogSalahSchema.parse(input);
  const { supabase, user } = await authedClient();

  const { error } = await supabase
    .from('salah_logs')
    .delete()
    .eq('user_id', user.id)
    .eq('prayer', parsed.prayer)
    .eq('log_date', parsed.log_date);

  if (error) throw error;
  revalidatePath('/salah');
  revalidatePath('/');
}

/** Upsert the user's calc settings. */
export async function updateSalahSettings(input: SalahSettingsInput) {
  const parsed = SalahSettingsSchema.parse(input);
  const { supabase, user } = await authedClient();

  const { error } = await supabase
    .from('salah_settings')
    .upsert(
      { user_id: user.id, ...parsed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (error) throw error;
  revalidatePath('/salah');
  revalidatePath('/');
}
```

- [ ] **Step 7: Verify typecheck, lint, and tests**

Run: `npm run typecheck && npm run lint && npm run test:unit -- salah`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/schemas/salah.ts src/lib/data/salah.ts src/lib/actions/salah.ts tests/unit/domain/salah.test.ts
git commit -m "feat(salah): zod schemas, config loader, and server actions"
```

---

## Task 6: Home glance

**Files:**
- Create: `src/components/home/SalahGlance.tsx`
- Modify: `src/app/(app)/page.tsx`

**Interfaces:**
- Consumes: `SalahDaySummary` (type) + `salahDaySummary`, `loadSalahConfig`, `LoggedPrayer`.
- Produces: `<SalahGlance summary={...} />` rendered in the home masonry.

- [ ] **Step 1: Write the glance component**

Create `src/components/home/SalahGlance.tsx`:

```tsx
import {
  WidgetCard,
  WidgetLink,
} from '@/components/today/WidgetCard';
import type { SalahDaySummary } from '@/lib/domain/salah';

/** Read-only salah glance: prayed X/5 today + next prayer + streak/on-time%. */
export function SalahGlance({ summary }: { summary: SalahDaySummary }) {
  const { prayedCount, nextLabel, nextAt, streakCurrent, onTimeRate7d } = summary;
  const allDone = prayedCount === 5;

  return (
    <WidgetCard
      title="[ SALAH · TODAY ]"
      right={<WidgetLink href="/salah">SALAH</WidgetLink>}
      testid="home-salah"
    >
      <div className="flex items-baseline gap-2">
        <span
          className={`font-doto text-4xl font-bold leading-none tracking-tight tabular-nums ${
            allDone ? 'text-success' : 'text-text-display'
          }`}
        >
          {prayedCount}
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
          / 5 PRAYED
        </span>
      </div>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
        {nextLabel ? `NEXT ${nextLabel.toUpperCase()} ${nextAt}` : 'ALL DONE'}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        {streakCurrent}D STREAK · {Math.round(onTimeRate7d * 100)}% ON-TIME
      </p>
    </WidgetCard>
  );
}
```

- [ ] **Step 2: Wire it into the home page**

In `src/app/(app)/page.tsx`:

Add imports near the other domain/component imports:

```tsx
import { SalahGlance } from '@/components/home/SalahGlance';
import { loadSalahConfig } from '@/lib/data/salah';
import {
  salahDaySummary,
  PRAYERS,
  type LoggedPrayer,
  type PrayerName,
  type SalahStatus,
  type JamaatKind,
} from '@/lib/domain/salah';
```

Add a query to the existing `Promise.all([...])` array (append as a new element, e.g. after `bodyMetricsResult`):

```tsx
    supabase
      .from('salah_logs')
      .select('prayer, log_date, status, jamaat')
      .eq('user_id', userId)
      .gte('log_date', habitSince),
```

Destructure the new result alongside the others (add `salahLogsResult` to the destructuring list that receives the `Promise.all` results).

Then, before the `return`, build the summary:

```tsx
  // ── Salah (today) ────────────────────────────────────────────────────────
  const salahCfg = await loadSalahConfig(supabase, userId);
  const salahRows = (salahLogsResult.data ?? []) as Array<{
    prayer: PrayerName;
    log_date: string;
    status: SalahStatus;
    jamaat: JamaatKind | null;
  }>;
  const salahByDate = new Map<string, LoggedPrayer[]>();
  for (const r of salahRows) {
    if (!salahByDate.has(r.log_date)) salahByDate.set(r.log_date, []);
    // Guard against any legacy duplicate (prayer,date) rows.
    const day = salahByDate.get(r.log_date)!;
    if (!day.some((l) => l.prayer === r.prayer)) {
      day.push({ prayer: r.prayer, status: r.status, jamaat: r.jamaat });
    }
  }
  const salahSummary = salahDaySummary(
    salahCfg,
    salahByDate.get(today) ?? [],
    salahByDate,
    now,
    today,
  );
```

Render the glance in the masonry `<div className="gap-4 lg:columns-2 xl:columns-3">`, right after `<PillsGlance adherence={pills} />`:

```tsx
        <SalahGlance summary={salahSummary} />
```

Note: `PRAYERS` is imported for type-inference symmetry but only the types are strictly required; keep whichever imports the linter accepts (remove `PRAYERS` if unused to satisfy `eslint`).

- [ ] **Step 3: Verify typecheck, lint, and build the page mentally**

Run: `npm run typecheck && npm run lint`
Expected: PASS. If lint flags an unused `PRAYERS` import, remove it.

- [ ] **Step 4: Visual check**

Run: `npm run dev`, open `/`, confirm the `[ SALAH · TODAY ]` card renders with `N / 5 PRAYED`, a next-prayer line, and a streak/on-time line. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/SalahGlance.tsx "src/app/(app)/page.tsx"
git commit -m "feat(salah): home glance with today's 5/5 + next prayer + streak"
```

---

## Task 7: `/salah` page — read-only surface

**Files:**
- Create: `src/app/(app)/salah/page.tsx`
- Create: `src/components/salah/SalahTodayInstrument.tsx`
- Create: `src/components/salah/SalahStreakCard.tsx`
- Create: `src/components/salah/SalahWeekGrid.tsx`
- Create: `src/components/salah/SalahMonthCard.tsx`
- Create: `src/components/salah/SalahTallyCard.tsx`

**Interfaces:**
- Consumes: `buildDayModel`, `buildSalahConsistency`, `loadSalahConfig`, domain types; `formatInTimeZone`; `requireUserId`, server `createClient`.
- Produces: the `/salah` route rendering a hero + read-only cards. Defines a serializable `CellVM` shape the log card (Task 8) also reuses.

- [ ] **Step 1: Read the Next.js routing guide**

Per the Global Constraints, skim `node_modules/next/dist/docs/` for the current server-component / page conventions before writing the route.

- [ ] **Step 2: Write the hero component**

Create `src/components/salah/SalahTodayInstrument.tsx`:

```tsx
import type { PrayerCellState, SalahStatus } from '@/lib/domain/salah';

export type CellVM = {
  name: string;
  label: string;
  timeLabel: string; // 'HH:mm'
  state: PrayerCellState;
  status: SalahStatus | null;
};

const STATE_DOT: Record<PrayerCellState, string> = {
  prayed: 'bg-success',
  current: 'bg-warning',
  upcoming: 'border border-border-visible bg-transparent',
  missed: 'bg-text-disabled',
};

/** Hero: the day's five prayers as a timeline + the next-prayer readout. */
export function SalahTodayInstrument({
  dateLabel,
  cells,
  nextLabel,
  nextAt,
  nextIsTomorrow,
}: {
  dateLabel: string;
  cells: CellVM[];
  nextLabel: string | null;
  nextAt: string | null;
  nextIsTomorrow: boolean;
}) {
  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-6">
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ SALAH · {dateLabel} ]
        </h2>
        {nextLabel && (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            NEXT{nextIsTomorrow ? ' (TMRW)' : ''}
          </span>
        )}
      </header>

      {nextLabel && (
        <div className="mb-6 flex items-baseline gap-3">
          <span className="font-doto text-5xl font-bold leading-none tracking-tight tabular-nums text-text-display">
            {nextAt}
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
            {nextLabel}
          </span>
        </div>
      )}

      <ol className="flex flex-col gap-2.5">
        {cells.map((c) => (
          <li key={c.name} className="flex items-center gap-3">
            <span className={`size-2.5 shrink-0 rounded-full ${STATE_DOT[c.state]}`} />
            <span className="w-24 font-mono text-[12px] uppercase tracking-[0.06em] text-text-primary">
              {c.label}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-text-secondary">
              {c.timeLabel}
            </span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
              {c.state === 'prayed' ? (c.status ?? '') : c.state}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 3: Write the streak card**

Create `src/components/salah/SalahStreakCard.tsx`:

```tsx
import { WidgetCard } from '@/components/today/WidgetCard';

export function SalahStreakCard({
  streakCurrent,
  streakLongest,
  onTimeRate30d,
}: {
  streakCurrent: number;
  streakLongest: number;
  onTimeRate30d: number;
}) {
  return (
    <WidgetCard title="[ SALAH · STREAK ]" testid="salah-streak">
      <div className="flex items-baseline gap-2">
        <span className="font-doto text-4xl font-bold leading-none tracking-tight tabular-nums text-text-display">
          {streakCurrent}
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
          DAY STREAK
        </span>
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        LONGEST {streakLongest}D · {Math.round(onTimeRate30d * 100)}% ON-TIME (30D)
      </p>
    </WidgetCard>
  );
}
```

- [ ] **Step 4: Write the week grid**

Create `src/components/salah/SalahWeekGrid.tsx`:

```tsx
import { WidgetCard } from '@/components/today/WidgetCard';
import type { WeekCellStatus, WeekDay } from '@/lib/domain/salah';

const CELL: Record<WeekCellStatus, string> = {
  on_time: 'bg-success',
  late: 'bg-warning',
  qada: 'bg-info',
  missed: 'bg-text-disabled',
  pending: 'border border-border-visible bg-transparent',
};

const ROWS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

/** 5 prayers (rows) × 7 days (cols), oldest → newest left to right. */
export function SalahWeekGrid({ week }: { week: WeekDay[] }) {
  return (
    <WidgetCard title="[ SALAH · 7 DAYS ]" testid="salah-week">
      <div className="flex flex-col gap-[3px]">
        {ROWS.map((prayer) => (
          <div key={prayer} className="flex items-center gap-[3px]">
            <span className="w-14 font-mono text-[9px] uppercase tracking-[0.06em] text-text-disabled">
              {prayer}
            </span>
            {week.map((d) => {
              const cell = d.prayers.find((p) => p.name === prayer)!;
              return (
                <div
                  key={d.date}
                  title={`${d.date} · ${prayer} · ${cell.status}`}
                  className={`h-4 flex-1 ${CELL[cell.status]} ${
                    d.isToday ? 'ring-1 ring-text-secondary' : ''
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
```

- [ ] **Step 5: Write the month + tally cards**

Create `src/components/salah/SalahMonthCard.tsx`:

```tsx
import { WidgetCard } from '@/components/today/WidgetCard';

export function SalahMonthCard({
  onTimeRate30d,
  jamaatRate30d,
  totalLogged30d,
}: {
  onTimeRate30d: number;
  jamaatRate30d: number;
  totalLogged30d: number;
}) {
  return (
    <WidgetCard title="[ SALAH · 30 DAYS ]" testid="salah-month">
      <dl className="flex flex-col gap-3">
        <Row label="ON-TIME" value={`${Math.round(onTimeRate30d * 100)}%`} />
        <Row label="JAMAAT" value={`${Math.round(jamaatRate30d * 100)}%`} />
        <Row label="PRAYERS LOGGED" value={String(totalLogged30d)} />
      </dl>
    </WidgetCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        {label}
      </dt>
      <dd className="font-mono text-[13px] tabular-nums text-text-primary">{value}</dd>
    </div>
  );
}
```

Create `src/components/salah/SalahTallyCard.tsx`:

```tsx
import { WidgetCard } from '@/components/today/WidgetCard';

export function SalahTallyCard({
  qadaCount30d,
  missedCount30d,
}: {
  qadaCount30d: number;
  missedCount30d: number;
}) {
  return (
    <WidgetCard title="[ SALAH · MAKE-UP ]" testid="salah-tally">
      <div className="flex gap-8">
        <div>
          <span className="font-doto text-3xl font-bold leading-none tabular-nums text-info">
            {qadaCount30d}
          </span>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            QADA (30D)
          </p>
        </div>
        <div>
          <span className="font-doto text-3xl font-bold leading-none tabular-nums text-text-disabled">
            {missedCount30d}
          </span>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            MISSED (30D)
          </p>
        </div>
      </div>
    </WidgetCard>
  );
}
```

- [ ] **Step 6: Write the page**

Create `src/app/(app)/salah/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import { formatInTimeZone } from 'date-fns-tz';
import { addDaysISO } from '@/lib/domain/habit-consistency';
import { loadSalahConfig } from '@/lib/data/salah';
import {
  buildDayModel,
  buildSalahConsistency,
  type LoggedPrayer,
  type PrayerName,
  type SalahStatus,
  type JamaatKind,
} from '@/lib/domain/salah';
import {
  SalahTodayInstrument,
  type CellVM,
} from '@/components/salah/SalahTodayInstrument';
import { SalahStreakCard } from '@/components/salah/SalahStreakCard';
import { SalahWeekGrid } from '@/components/salah/SalahWeekGrid';
import { SalahMonthCard } from '@/components/salah/SalahMonthCard';
import { SalahTallyCard } from '@/components/salah/SalahTallyCard';

export default async function SalahPage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const cfg = await loadSalahConfig(supabase, userId);

  const now = new Date();
  const today = toUserDate(now, cfg.timezone);
  const since = addDaysISO(today, -60);

  const { data } = await supabase
    .from('salah_logs')
    .select('prayer, log_date, status, jamaat')
    .eq('user_id', userId)
    .gte('log_date', since);

  const rows = (data ?? []) as Array<{
    prayer: PrayerName;
    log_date: string;
    status: SalahStatus;
    jamaat: JamaatKind | null;
  }>;
  const byDate = new Map<string, LoggedPrayer[]>();
  for (const r of rows) {
    if (!byDate.has(r.log_date)) byDate.set(r.log_date, []);
    const day = byDate.get(r.log_date)!;
    if (!day.some((l) => l.prayer === r.prayer)) {
      day.push({ prayer: r.prayer, status: r.status, jamaat: r.jamaat });
    }
  }

  const model = buildDayModel(now, cfg, byDate.get(today) ?? []);
  const consistency = buildSalahConsistency(byDate, today, now, cfg);

  const cells: CellVM[] = model.cells.map((c) => ({
    name: c.name,
    label: c.label,
    timeLabel: formatInTimeZone(c.start, cfg.timezone, 'HH:mm'),
    state: c.state,
    status: c.status,
  }));
  const dateLabel = formatInTimeZone(now, cfg.timezone, 'EEE d MMM').toUpperCase();
  const nextLabel = model.next
    ? (model.next.name === 'dhuhr'
        ? cells.find((c) => c.name === 'dhuhr')?.label ?? 'Dhuhr'
        : cells.find((c) => c.name === model.next!.name)?.label ??
          model.next.name)
    : null;
  const nextAt = model.next
    ? formatInTimeZone(model.next.at, cfg.timezone, 'HH:mm')
    : null;

  return (
    <main className="w-full space-y-4 px-4 py-8">
      <header className="mb-2">
        <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">
          SALAH
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {cfg.timezone.replace('_', ' ')}
        </p>
      </header>

      <SalahTodayInstrument
        dateLabel={dateLabel}
        cells={cells}
        nextLabel={nextLabel}
        nextAt={nextAt}
        nextIsTomorrow={model.next?.isTomorrow ?? false}
      />

      <div className="gap-4 lg:columns-2 xl:columns-3">
        <SalahStreakCard
          streakCurrent={consistency.streakCurrent}
          streakLongest={consistency.streakLongest}
          onTimeRate30d={consistency.onTimeRate30d}
        />
        <SalahWeekGrid week={consistency.week} />
        <SalahMonthCard
          onTimeRate30d={consistency.onTimeRate30d}
          jamaatRate30d={consistency.jamaatRate30d}
          totalLogged30d={consistency.totalLogged30d}
        />
        <SalahTallyCard
          qadaCount30d={consistency.qadaCount30d}
          missedCount30d={consistency.missedCount30d}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 8: Visual check**

Run: `npm run dev`, open `/salah`. Confirm the hero shows the five prayers with times, the next-prayer readout, and the four cards render. Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/salah/page.tsx" src/components/salah/
git commit -m "feat(salah): /salah page with prayer-times hero and consistency cards"
```

---

## Task 8: `/salah` logging — SalahLogCard (client)

**Files:**
- Create: `src/components/salah/SalahLogCard.tsx`
- Modify: `src/app/(app)/salah/page.tsx`

**Interfaces:**
- Consumes: `logSalah`, `updateSalahLog`, `unlogSalah` (actions); `CellVM`.
- Produces: `<SalahLogCard cells={...} today={...} />` — interactive log controls.

- [ ] **Step 1: Write the client log card (with inline StatusPicker + JamaatToggle)**

Create `src/components/salah/SalahLogCard.tsx`:

```tsx
'use client';

import * as React from 'react';
import { WidgetCard } from '@/components/today/WidgetCard';
import { logSalah, updateSalahLog, unlogSalah } from '@/lib/actions/salah';
import type { CellVM } from '@/components/salah/SalahTodayInstrument';
import type { SalahStatus, JamaatKind } from '@/lib/domain/salah';

const STATUSES: SalahStatus[] = ['on_time', 'late', 'qada'];
const STATUS_LABEL: Record<SalahStatus, string> = {
  on_time: 'ON-TIME',
  late: 'LATE',
  qada: 'QADA',
};
const JAMAATS: JamaatKind[] = ['alone', 'jamaat', 'masjid'];

export function SalahLogCard({
  cells,
  today,
}: {
  cells: CellVM[];
  today: string;
}) {
  return (
    <WidgetCard title="[ SALAH · LOG TODAY ]" testid="salah-log">
      <ul className="flex flex-col gap-4">
        {cells.map((c) => (
          <PrayerRow key={c.name} cell={c} today={today} />
        ))}
      </ul>
    </WidgetCard>
  );
}

function PrayerRow({ cell, today }: { cell: CellVM; today: string }) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const prayer = cell.name as import('@/lib/domain/salah').PrayerName;
  const logged = cell.state === 'prayed';
  // A prayer whose window has not opened yet cannot be logged.
  const canLog = cell.state !== 'upcoming';

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setPending(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="w-24 font-mono text-[12px] uppercase tracking-[0.06em] text-text-primary">
          {cell.label}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-text-secondary">
          {cell.timeLabel}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {error && (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
              {error}
            </span>
          )}
          {!logged ? (
            <button
              type="button"
              disabled={pending || !canLog}
              onClick={() => run(() => logSalah({ prayer }))}
              data-testid={`salah-log-${prayer}`}
              className="h-8 min-w-[3rem] rounded-full bg-text-display px-3.5 font-mono text-[11px] uppercase tracking-[0.06em] text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? '…' : canLog ? 'LOG' : '—'}
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => unlogSalah({ prayer, log_date: today }))}
              data-testid={`salah-unlog-${prayer}`}
              className="h-8 rounded-full border border-border-visible px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-text-disabled transition-colors hover:text-text-primary disabled:opacity-40"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {logged && (
        <div className="flex flex-wrap items-center gap-1.5 pl-24">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => updateSalahLog({ prayer, log_date: today, status: s }))
              }
              className={`h-6 rounded-full px-2.5 font-mono text-[9px] uppercase tracking-[0.06em] transition-colors disabled:opacity-40 ${
                cell.status === s
                  ? 'bg-text-display text-background'
                  : 'border border-border-visible text-text-disabled hover:text-text-primary'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
          <span className="mx-1 text-text-disabled">·</span>
          {JAMAATS.map((j) => (
            <button
              key={j}
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => updateSalahLog({ prayer, log_date: today, jamaat: j }))
              }
              className="h-6 rounded-full border border-border-visible px-2.5 font-mono text-[9px] uppercase tracking-[0.06em] text-text-disabled transition-colors hover:text-text-primary disabled:opacity-40"
            >
              {j}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 2: Mount it on the page**

In `src/app/(app)/salah/page.tsx`, add the import:

```tsx
import { SalahLogCard } from '@/components/salah/SalahLogCard';
```

Render it as the FIRST card inside the masonry `<div className="gap-4 lg:columns-2 xl:columns-3">`, before `SalahStreakCard`:

```tsx
        <SalahLogCard cells={cells} today={today} />
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Visual + behavior check**

Run: `npm run dev`, open `/salah`. Tap a prayer's `LOG` → it becomes logged with a suggested status; adjust status and jamaat; tap ✕ to unlog. Confirm the hero/streak update after each action (revalidation). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/salah/SalahLogCard.tsx "src/app/(app)/salah/page.tsx"
git commit -m "feat(salah): tap-to-log with editable status and jamaat"
```

---

## Task 9: Settings section

**Files:**
- Create: `src/components/salah/SalahSettingsForm.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `updateSalahSettings`, `loadSalahConfig`, `TASHKENT_DEFAULT`.
- Produces: a settings card that edits the calc config.

- [ ] **Step 1: Write the settings form (client)**

Create `src/components/salah/SalahSettingsForm.tsx`:

```tsx
'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSalahSettings } from '@/lib/actions/salah';
import { TASHKENT_DEFAULT } from '@/lib/domain/salah';

export type SalahSettingsValues = {
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  fajr_angle: number;
  isha_angle: number;
  isha_interval: number;
  madhab: 'hanafi' | 'shafi';
  offset_fajr: number;
  offset_dhuhr: number;
  offset_asr: number;
  offset_maghrib: number;
  offset_isha: number;
  late_after_fraction: number;
};

const TASHKENT_PRESET: SalahSettingsValues = {
  city: 'Tashkent',
  latitude: TASHKENT_DEFAULT.latitude,
  longitude: TASHKENT_DEFAULT.longitude,
  timezone: TASHKENT_DEFAULT.timezone,
  fajr_angle: TASHKENT_DEFAULT.fajrAngle,
  isha_angle: TASHKENT_DEFAULT.ishaAngle,
  isha_interval: TASHKENT_DEFAULT.ishaInterval,
  madhab: TASHKENT_DEFAULT.madhab,
  offset_fajr: TASHKENT_DEFAULT.offsets.fajr,
  offset_dhuhr: TASHKENT_DEFAULT.offsets.dhuhr,
  offset_asr: TASHKENT_DEFAULT.offsets.asr,
  offset_maghrib: TASHKENT_DEFAULT.offsets.maghrib,
  offset_isha: TASHKENT_DEFAULT.offsets.isha,
  late_after_fraction: TASHKENT_DEFAULT.lateAfterFraction,
};

export function SalahSettingsForm({ initial }: { initial: SalahSettingsValues }) {
  const [values, setValues] = React.useState<SalahSettingsValues>(initial);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const num = (k: keyof SalahSettingsValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: Number(e.target.value) }));
  const str = (k: keyof SalahSettingsValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await updateSalahSettings(values);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setPending(false);
    }
  };

  const field = (k: keyof SalahSettingsValues, label: string, step = '1') => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={k} className="text-xs">
        {label}
      </Label>
      <Input
        id={k}
        type="number"
        step={step}
        value={values[k] as number}
        onChange={num(k)}
      />
    </div>
  );

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Salah / prayer times</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setValues(TASHKENT_PRESET)}
        >
          Tashkent (Muftiyat)
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Default angles match the islom.uz timetable (±1–2 min). Tune per-prayer
        offsets to pin exactly to your local table.
      </p>

      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor="city" className="text-xs">City</Label>
          <Input id="city" value={values.city} onChange={str('city')} />
        </div>
        {field('latitude', 'Latitude', 'any')}
        {field('longitude', 'Longitude', 'any')}
        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor="timezone" className="text-xs">Timezone (IANA)</Label>
          <Input id="timezone" value={values.timezone} onChange={str('timezone')} />
        </div>
        {field('fajr_angle', 'Fajr angle°', 'any')}
        {field('isha_angle', 'Isha angle°', 'any')}
        {field('isha_interval', 'Isha interval (min, 0 = angle)')}

        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor="madhab" className="text-xs">Asr madhab</Label>
          <select
            id="madhab"
            value={values.madhab}
            onChange={(e) =>
              setValues((v) => ({ ...v, madhab: e.target.value as 'hanafi' | 'shafi' }))
            }
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="hanafi">Hanafi (later Asr)</option>
            <option value="shafi">Standard (Shafi/Maliki/Hanbali)</option>
          </select>
        </div>

        {field('offset_fajr', 'Fajr offset (min)')}
        {field('offset_dhuhr', 'Dhuhr offset (min)')}
        {field('offset_asr', 'Asr offset (min)')}
        {field('offset_maghrib', 'Maghrib offset (min)')}
        {field('offset_isha', 'Isha offset (min)')}
        {field('late_after_fraction', 'Late after (fraction 0–1)', 'any')}

        <div className="col-span-2 mt-2 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="text-xs text-muted-foreground">Saved.</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Mount it in the settings page**

In `src/app/(app)/settings/page.tsx`:

Add imports:

```tsx
import { createClient } from '@/lib/supabase/server';
import { loadSalahConfig } from '@/lib/data/salah';
import {
  SalahSettingsForm,
  type SalahSettingsValues,
} from '@/components/salah/SalahSettingsForm';
```

Replace the `await requireUserId();` line with a version that also loads config, and build the initial values (the config lacks `city`, so read it separately with a default):

```tsx
  const userId = await requireUserId();
  const supabase = await createClient();
  const cfg = await loadSalahConfig(supabase, userId);
  const { data: cityRow } = await supabase
    .from('salah_settings')
    .select('city')
    .eq('user_id', userId)
    .maybeSingle();
  const salahInitial: SalahSettingsValues = {
    city: (cityRow as { city?: string } | null)?.city ?? 'Tashkent',
    latitude: cfg.latitude,
    longitude: cfg.longitude,
    timezone: cfg.timezone,
    fajr_angle: cfg.fajrAngle,
    isha_angle: cfg.ishaAngle,
    isha_interval: cfg.ishaInterval,
    madhab: cfg.madhab,
    offset_fajr: cfg.offsets.fajr,
    offset_dhuhr: cfg.offsets.dhuhr,
    offset_asr: cfg.offsets.asr,
    offset_maghrib: cfg.offsets.maghrib,
    offset_isha: cfg.offsets.isha,
    late_after_fraction: cfg.lateAfterFraction,
  };
```

Render the form inside the `<main>` (e.g. after the Export card, before the Danger zone card):

```tsx
      <SalahSettingsForm initial={salahInitial} />
```

Note: confirm `Input` and `Label` primitives exist at `@/components/ui/input` and `@/components/ui/label` (they are listed in the UI primitives). If `Button` has no `variant="outline"`/`size="sm"`, drop those props.

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Visual + behavior check**

Run: `npm run dev`, open `/settings`. Confirm the Salah card renders, "Tashkent (Muftiyat)" fills defaults, and Save persists (reload → values retained; `/salah` times reflect any offset change). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/salah/SalahSettingsForm.tsx "src/app/(app)/settings/page.tsx"
git commit -m "feat(salah): settings form for location and calc config"
```

---

## Task 10: Sidebar nav + full verification

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: a `/salah` nav entry.

- [ ] **Step 1: Add the nav item**

In `src/components/layout/AppSidebar.tsx`, add `Moon` to the `lucide-react` import, and insert a nav entry after the Pills line in `NAV_ITEMS`:

Change the import line:

```tsx
import { Home, Dumbbell, User, LogOut, Sun, Moon, ListChecks, Pill, Target, CalendarDays, Timer, Wallet, Settings } from 'lucide-react'
```

Add to `NAV_ITEMS` (after the `/pills` entry):

```tsx
  { href: '/salah', icon: Moon, label: 'Salah' },
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Full verification**

Run: `npm run verify`
Expected: typecheck + lint + unit tests + e2e all PASS. If a pre-existing e2e test needs a running app or fixture unrelated to salah, note it — do not fix unrelated failures here; confirm the salah unit tests (`npm run test:unit -- salah`) pass and typecheck/lint are green.

- [ ] **Step 4: Visual check**

Run: `npm run dev`. Confirm the sidebar shows "Salah" and it routes to `/salah`. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppSidebar.tsx
git commit -m "feat(salah): add Salah to the sidebar nav"
```

---

## Self-Review

**1. Spec coverage:**
- Computed prayer times + adhan + Tashkent match → Tasks 1–2. ✓
- Config model + user-tunable offsets → Task 2 (`TASHKENT_DEFAULT`) + Task 9 (settings). ✓
- Windows + on_time/late/qada/missed classification → Task 3. ✓
- Jamaat (alone/jamaat/masjid) → migration (Task 1), schema/action (Task 5), UI (Task 8). ✓
- Fard 5 + Friday Jumu'ah label → Task 4 (`buildDayModel`). ✓
- Streak (all-5-prayed) + on-time% → Task 4 (`buildSalahConsistency`). ✓
- Tap-to-log, auto-status, editable → Task 5 (`logSalah` default via `suggestStatus`) + Task 8 (edit controls). ✓
- Data model (salah_logs unique + salah_settings optional, auth.users, split RLS) → Task 1. ✓
- Domain module + fixtures tests → Tasks 2–4. ✓
- `/salah` hero + masonry → Tasks 7–8. ✓
- Home glance → Task 6. ✓
- Settings → Task 9. ✓
- Sidebar nav → Task 10. ✓
- Timezone correctness (never UTC-today) → enforced throughout via `cfg.timezone` + `toUserDate`/`formatInTimeZone`. ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output. ✓

**3. Type consistency:** `SalahCalcConfig`, `LoggedPrayer`, `PrayerName`, `SalahStatus`, `JamaatKind`, `PrayerCellState`, `WeekCellStatus`, `WeekDay`, `DayModel`, `NextPrayer`, `CellVM`, `SalahDaySummary` are defined once (Tasks 2/4/7) and consumed with matching shapes downstream. Action inputs (`LogSalahInput` etc.) match `salah_logs` columns. `loadSalahConfig` returns exactly `SalahCalcConfig`. Migration columns match `SalahSettingsSchema` fields and the `SettingsRow` mapping. ✓

**Notes for the implementer:**
- The `adhan` fixture tolerance is ±3 min (year-to-year equation-of-time drift on a perpetual taqvim). If a fixture fails by 1 min, that is expected drift — do not "fix" by changing angles; the angles are load-bearing. Widen tolerance to 4 only if a genuine off-by-one appears across multiple dates.
- `salah_logs` referencing `auth.users(id)` (not `profiles`) is intentional — it mirrors the verified `habit_logs` pattern and `auth.uid()` equals both ids.
- If `npm run db:reset` is not wired to a local Supabase in the environment, apply `022_salah.sql` to the live project and regenerate types against the linked project; the code does not depend on generated types (it casts row shapes explicitly), so a missed regeneration will not block compilation.
