# Salah Tracker — Design

**Date:** 2026-07-01
**Status:** Approved, ready for implementation plan

## Goal

Add a salah (five daily prayers) tracker to the app: a new `/salah` surface, a
home glance, and a settings section. Prayer times are **computed server-side**
for a fixed location and matched to the Tashkent Muftiyat (islom.uz) timetable,
so the user logs each prayer against its real window and gets an honest per-prayer
status (on-time / late / qada / missed), jamaat tracking, and streak/consistency
metrics.

The feature follows existing conventions exactly:

- **Time:** `toUserDate` / `userDayBounds` (`src/lib/domain/timezone.ts`) with
  `profiles.timezone` (Asia/Tashkent, GMT+5). Never `new Date().toISOString()`
  UTC-today (the pattern used correctly by Home/Today/Habits, and wrongly by
  Goals/Expenses/Workout).
- **Data:** a definition/settings table + a per-event logs table, mirroring the
  `habits` / `habit_logs` split — but with a real uniqueness constraint so there
  is no app-level dedupe.
- **UI:** the Nothing "instrument hero + masonry" language (`WidgetCard`,
  Space Mono bracket labels, `font-doto` readouts, dark tokens).
- **Home:** a read-only `WidgetCard` glance fed by a pure summary builder.

## Decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| Tracking model | Computed prayer times, server-side |
| Location | Fixed lat/long + city, tunable in Settings (default Tashkent 41.2995, 69.2401) |
| Calc method | Custom **Fajr 15.5° / Isha 15.5°**, **Hanafi** Asr, **Maghrib +3 min**; per-prayer offsets user-tunable |
| Classification | `on_time` (first ⅔ of window) → `late` (last ⅓) → `qada` (after window) → `missed` (derived) |
| Jamaat | Optional `alone / jamaat / masjid` per log |
| Prayer scope | Fard 5 only; Friday Dhuhr labelled **Jumu'ah** (same slot, no separate row) |
| Streak | Headline = all-5-prayed (any status); separate on-time % for quality |
| Logging UX | Tap logs it with auto-suggested status, then editable |
| Library | `adhan` v4.4.4 (MIT, zero-dep, ships TS types) — new dependency |

## Prayer-time calculation

### Library

Add **`adhan`** (adhan-js) v4.4.4 — MIT, zero runtime dependencies, ships native
TypeScript declarations, timezone-agnostic (returns absolute UTC `Date`
instants). Runs in the Next.js server runtime with no polyfills. `date-fns@4.1.0`
and `date-fns-tz@3.2.0` are already present and are reused for rendering.

```bash
npm install adhan
```

### Config model

`SalahCalcConfig` lives in the domain module and is persisted per user in
`salah_settings` (see schema). Default reproduces islom.uz to ≤1–2 min:

```ts
export type Madhab = 'hanafi' | 'shafi';

export type SalahCalcConfig = {
  latitude: number;
  longitude: number;
  timezone: string;              // IANA, e.g. 'Asia/Tashkent'
  fajrAngle: number;             // degrees
  ishaAngle: number;             // degrees
  ishaInterval: number;          // minutes; 0 = use ishaAngle
  madhab: Madhab;                // Hanafi = later Asr
  offsets: { fajr: number; dhuhr: number; asr: number; maghrib: number; isha: number };
  lateAfterFraction: number;     // 0..1; start of "late" as fraction of window
};

export const TASHKENT_DEFAULT: SalahCalcConfig = {
  latitude: 41.2995,
  longitude: 69.2401,
  timezone: 'Asia/Tashkent',
  fajrAngle: 15.5,
  ishaAngle: 15.5,
  ishaInterval: 0,
  madhab: 'hanafi',
  offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 3, isha: 0 }, // Maghrib = sunset + 3 min
  lateAfterFraction: 2 / 3,
};
```

**Provenance / caveat:** the 15.5°/15.5° angles and Maghrib +3 min were
empirically reverse-engineered by matching the official islom.uz table across
five seasonal dates (residuals ≤1–2 min from rounding). No official document
publishes the astronomical angles, so **all five offsets and both angles are
user-tunable in Settings**. Asia/Tashkent is a fixed UTC+5 offset — **no DST** —
so no seasonal shift math is needed. Elevation is intentionally 0 (the official
table is sea-level; the +3 Maghrib offset stands in for the precautionary
correction).

### Computation (adhan facts)

- `new adhan.PrayerTimes(coordinates, date, params)` reads **only Y/M/D** from
  `date` and returns absolute UTC instants. So we derive the **Tashkent-local**
  Y/M/D first via `toUserDate(nowUtc, tz)`, then feed those integers as
  `new Date(y, m-1, d)`.
- Custom angles: `new adhan.CalculationParameters('Other', fajrAngle, ishaAngle)`;
  set `ishaInterval` only when `> 0`.
- Asr: `params.madhab = adhan.Madhab.Hanafi`.
- User offsets go in **`params.adjustments`** (`{fajr,dhuhr,asr,maghrib,isha}` in
  minutes), NOT `params.methodAdjustments` (which presets own).
- Current/next: `pt.currentPrayer(atUtc)` / `pt.nextPrayer(atUtc)` — `nextPrayer`
  returns `Prayer.None` after Isha until the next day's Fajr.
- **Rendering:** always `formatInTimeZone(instant, tz, 'HH:mm')` from
  `date-fns-tz`. Never `.getHours()` / `.getMinutes()` (those use the server zone).

### Windows

A prayer's window is `[start, nextStart)`. **Isha's end = tomorrow's Fajr**, so
the module computes the next day's times too:

```
fajr    [fajr,    dhuhr)
dhuhr   [dhuhr,   asr)
asr     [asr,     maghrib)
maghrib [maghrib, isha)
isha    [isha,    tomorrow.fajr)
```

### Status classification

```ts
export type SalahStatus = 'on_time' | 'late' | 'qada'; // 'missed' is derived, never stored

// on_time: first (lateAfterFraction) of the window
// late:    at/after the lateAfterFraction threshold, still before end
// qada:    at/after end (window fully passed) OR before start (edge)
function classifyLog(loggedAt: Date, w: { start: Date; end: Date }, lateFraction: number): SalahStatus;

// suggested status for a fresh tap = classifyLog(now, window)
function suggestStatus(now: Date, w: { start: Date; end: Date }, lateFraction: number): SalahStatus;

// missed: no log exists AND now >= window.end
function isMissed(now: Date, w: { start: Date; end: Date }, hasLog: boolean): boolean;
```

Because the user typically opens the app after a prayer's window has passed,
`logSalah` seeds the status from `suggestStatus` but the value is **stored
explicitly** and editable — so an on-time prayer logged at noon can be corrected
from the auto-suggested `qada` back to `on_time`.

## Data model — migration `022_salah.sql`

Introspect the live Supabase DB before applying (per the "DB objects not in
migrations" note), then regenerate types with `npm run db:types`.

### `salah_logs` — one row per prayer per day

```sql
create table public.salah_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  prayer     text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  log_date   date not null,                 -- user-local, via toUserDate(logged_at, tz)
  status     text not null check (status in ('on_time','late','qada')),
  jamaat     text     null check (jamaat in ('alone','jamaat','masjid')),
  logged_at  timestamptz not null default now(),
  note       text     null,
  created_at timestamptz default now(),
  unique (user_id, prayer, log_date)
);
create index idx_salah_logs_user_date on public.salah_logs (user_id, log_date);

alter table public.salah_logs enable row level security;
create policy "Users manage own salah_logs" on public.salah_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

`missed` is never a stored status — it is derived from the *absence* of a row for
a prayer whose window has fully passed. The `unique (user_id, prayer, log_date)`
constraint means logging is an upsert and there is **no app-level dedupe** (unlike
`habit_logs`).

### `salah_settings` — one optional row per user

```sql
create table public.salah_settings (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  city                text    not null default 'Tashkent',
  latitude            numeric not null default 41.2995,
  longitude           numeric not null default 69.2401,
  timezone            text    not null default 'Asia/Tashkent',
  fajr_angle          numeric not null default 15.5,
  isha_angle          numeric not null default 15.5,
  isha_interval       integer not null default 0,
  madhab              text    not null default 'hanafi' check (madhab in ('hanafi','shafi')),
  offset_fajr         integer not null default 0,
  offset_dhuhr        integer not null default 0,
  offset_asr          integer not null default 0,
  offset_maghrib      integer not null default 3,
  offset_isha         integer not null default 0,
  late_after_fraction numeric not null default 0.6667 check (late_after_fraction >= 0 and late_after_fraction <= 1),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.salah_settings enable row level security;
create policy "Users manage own salah_settings" on public.salah_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**No trigger / auto-seed.** If a user has no `salah_settings` row, the data layer
falls back to `TASHKENT_DEFAULT` in code. A row is written only when the user
saves settings. This keeps migration 022 free of dashboard-created trigger
concerns and avoids coupling to `handle_new_user()`.

Computed prayer times are **never stored** — they are cheap, deterministic, and
computed on read.

## Domain module — `src/lib/domain/salah.ts` (pure, no I/O)

The heart of the feature; fully unit-tested. Mirrors the role of
`src/lib/domain/timezone.ts`.

Exports:

- Constants/types: `PRAYERS` (ordered `['fajr','dhuhr','asr','maghrib','isha']`),
  `PrayerName`, `SalahStatus`, `JamaatKind = 'alone'|'jamaat'|'masjid'`, `Madhab`,
  `SalahCalcConfig`, `TASHKENT_DEFAULT`.
- `buildParams(cfg): adhan.CalculationParameters`
- `prayerTimes(localYmd: string, cfg): Record<PrayerName, Date>` — one day's
  start instants.
- `prayerWindows(nowUtc: Date, cfg): Record<PrayerName, { start: Date; end: Date }>`
  — today's windows, Isha closed against tomorrow's Fajr.
- `currentAndNext(nowUtc, cfg): { current: PrayerName | null; next: PrayerName | null; nextAt: Date | null }`
- `suggestStatus`, `classifyLog`, `isMissed` (as above).
- `buildDayModel(nowUtc, cfg, todaysLogs): PrayerCell[]` where each cell is
  `{ name, label, start, end, state: 'prayed'|'current'|'upcoming'|'missed', status?, jamaat? }`.
  `label` is `"Jumu'ah"` when `name === 'dhuhr'` and the local day is Friday,
  else the prayer's display name.
- `buildSalahConsistency(logsByDate: Map<string, LogLite[]>, today: string, windowDays: number): SalahConsistency`
  where a **perfect day** = all 5 prayers logged (any status), and:

```ts
export type SalahConsistency = {
  streakCurrent: number;      // consecutive perfect days ending today/yesterday
  streakLongest: number;
  onTimeRate30d: number;      // on_time / total logged, last 30d, 0..1
  jamaatRate30d: number;      // jamaat|masjid / total logged, last 30d
  qadaCount30d: number;
  missedCount30d: number;     // due prayers with no log whose window passed
  week: DayCell[];            // last 7 days, each { date, prayedCount, onTimeCount }
};
```

## Server actions — `src/lib/actions/salah.ts`

`'use server'`, Zod-validated via `src/lib/schemas/salah.ts`, `authedClient()`
+ `getUserTimezone()`, `revalidatePath('/salah')` and `revalidatePath('/')`:

- `logSalah({ prayer, logDate?, status?, jamaat? })` — upsert on
  `(user_id, prayer, log_date)`. `logDate` defaults to `toUserDate(now, tz)`;
  `status` defaults to `suggestStatus(now, window, lateFraction)`.
- `updateSalahLog({ prayer, logDate, status?, jamaat? })` — same upsert path.
- `unlogSalah({ prayer, logDate })` — delete the row.
- `updateSalahSettings(input)` — upsert the `salah_settings` row.

Schemas in `src/lib/schemas/salah.ts`: `PrayerNameSchema`, `SalahStatusSchema`,
`JamaatKindSchema`, `LogSalahSchema`, `UpdateSalahLogSchema`, `UnlogSalahSchema`,
`SalahSettingsSchema`.

## UI

### `/salah` page — `src/app/(app)/salah/page.tsx` (server component)

1. Read `salah_settings` (fall back to `TASHKENT_DEFAULT`), build `cfg`.
2. `today = toUserDate(now, tz)`; query today's logs and the last ~60 days of
   logs in one/two Supabase calls scoped by `user_id` + `log_date`.
3. Compute `buildDayModel(now, cfg, todaysLogs)` and
   `buildSalahConsistency(logsByDate, today, 30)`.
4. Render **hero + masonry**:

**Hero — `SalahTodayInstrument`** (`src/components/salah/SalahTodayInstrument.tsx`):
today's five prayers as a vertical timeline with computed `HH:mm`, the current
prayer highlighted, a large `font-doto` readout of the **next prayer + its time**,
and per-prayer status dots.

**Masonry cards** (each a `WidgetCard`, `break-inside-avoid`, in a
`gap-4 lg:columns-2 xl:columns-3` grid):

- **`SalahLogCard`** (client) — one tappable row per prayer: tap logs it (calls
  `logSalah`), then a `StatusPicker` (on-time/late/qada) and `JamaatToggle`
  (alone/jamaat/masjid) let the user adjust. Missed prayers render dim.
- **`SalahStreakCard`** — current/longest perfect-day streak + on-time %.
- **`SalahWeekGrid`** — a 5×7 grid (prayers × last 7 days) of status dots.
- **`SalahMonthCard`** — 30-day heatmap + on-time % and jamaat %.
- **`SalahTallyCard`** — qada and missed counts (30d).

Status → Nothing token mapping: `on_time → --success`, `late → --warning`,
`qada → --info`, `missed → --text-disabled`.

### Home glance — `SalahGlance`

`src/components/home/SalahGlance.tsx` + a pure `salahDaySummary()` builder in
`src/lib/domain/home-overview.ts` (SSR-stable — takes `now`/`today` as args, no
`Date.now()` inside):

```ts
export type SalahDaySummary = {
  prayedCount: number;        // 0..5 logged today
  nextPrayer: string | null;  // display label, null after Isha
  nextPrayerAt: string | null;// 'HH:mm' in tz
  streakCurrent: number;
  onTimeRate7d: number;       // 0..1
};
export function salahDaySummary(
  cfg: SalahCalcConfig, todaysLogs: LogLite[], logsByDate: Map<string, LogLite[]>,
  now: Date, today: string,
): SalahDaySummary
```

Card: `[ SALAH · TODAY ]`, hero `font-doto` `N / 5`, secondary
`NEXT {PRAYER} {HH:mm}`, a `streak · on-time%` line, and a `SALAH →` link to
`/salah`. Wired into the home page `Promise.all()` and dropped into the masonry.

### Settings — `SalahSettingsForm`

A section in `/settings` (`src/components/salah/SalahSettingsForm.tsx`, client →
`updateSalahSettings`): city + lat/long, a **"Tashkent (Muftiyat)"** preset
button that fills `TASHKENT_DEFAULT`, plus fields for angles, madhab, the five
per-prayer offsets, and the late-threshold fraction.

### Nav

Add a `/salah` entry to the sidebar in `src/app/(app)/layout.tsx`.

## Edge cases

| Case | Behavior |
| --- | --- |
| App opened after a prayer's window closed, prayer prayed on time | Tap seeds `qada`; user corrects to `on_time`. Status stored explicitly. |
| After Isha, before midnight (Isha window open into tomorrow) | Isha window = `[isha, tomorrow.fajr)`; `nextPrayer` = None → hero shows tomorrow's Fajr. |
| No `salah_settings` row | Use `TASHKENT_DEFAULT`; nothing written until user saves. |
| Friday | Dhuhr slot label = "Jumu'ah"; same `prayer='dhuhr'` row/key. |
| Duplicate tap on same prayer/day | Upsert on `(user_id,prayer,log_date)` — updates, never duplicates. |
| Prayer window has not started yet (upcoming) | Cell state `upcoming`; logging allowed but suggests `qada` (before start) — user can override. |
| DST | None (Asia/Tashkent fixed +5) — no seasonal handling. |
| High-latitude rule | Not needed for Tashkent (41°N); leave adhan default. |

## Testing

TDD, domain first. `tests/unit/domain/salah.test.ts` (mirrors
`tests/unit/domain/timezone.test.ts`):

- **Prayer times vs official islom.uz fixtures**, tolerance ±2 min, using
  `TASHKENT_DEFAULT`:
  - Jul 1 — Fajr 03:09, Isha 21:45
  - Mar 21 — Fajr 05:06, Isha 19:55
  - Jun 21 — Fajr 03:04, Isha 21:46
  - Sep 23 — Fajr 04:52, Isha 19:38
  - Dec 21 — Fajr 06:19, Isha 18:23
- **Hanafi Asr** later than Shafi; **Maghrib = sunset + 3 min**.
- **Windows:** Isha end == next day's Fajr; consecutive windows are contiguous.
- **Classification boundaries:** on_time/late split at `lateAfterFraction`; qada
  at/after end and before start; `isMissed` true only when no log + window passed.
- **`suggestStatus`** matches `classifyLog(now, ...)`.
- **`buildDayModel`:** Friday Dhuhr → "Jumu'ah"; states resolve correctly.
- **`buildSalahConsistency`:** perfect-day streak (5 logs), on-time %, qada/missed
  counts, 7-day week cells.
- **`salahDaySummary`** in `src/lib/domain/__tests__/home-overview.test.ts`:
  `prayedCount`, next prayer + time, streak, on-time% — including the after-Isha
  (next = null) case.

Rendering is always through `formatInTimeZone`, so tests assert on instants /
`HH:mm` strings, not server-local time. `npm run verify` (typecheck + lint +
unit + e2e) must pass.

## Build order & guardrails

1. `npm install adhan`.
2. Migration `022_salah.sql` (introspect live DB first) → `npm run db:types`.
3. Domain module `salah.ts` + unit tests (TDD).
4. Zod schemas + server actions.
5. `/salah` page + `src/components/salah/*`.
6. Home glance + `salahDaySummary`.
7. Settings form.
8. Sidebar nav entry.
9. `npm run verify`.

**Next.js 16 caveat (AGENTS.md):** read the relevant guide in
`node_modules/next/dist/docs/` before writing server-component / server-action /
route code — this Next version has breaking changes vs. training data.

## Non-goals / YAGNI

- No prayer-time computation from device GPS in v1 (fixed profile location only).
- No sunnah/witr/tahajjud/taraweeh tracking (fard 5 only).
- No push/adhan notifications, no qibla, no Hijri calendar surface.
- No `/today` page integration in v1 (home glance + `/salah` only).
- No external prayer-time API dependency at runtime (islom.uz mirror is only a
  future cross-check option, not a dependency).
- No storing of computed prayer times.

## Files

**New:**
- `supabase/migrations/022_salah.sql`
- `src/lib/domain/salah.ts`
- `tests/unit/domain/salah.test.ts`
- `src/lib/schemas/salah.ts`
- `src/lib/actions/salah.ts`
- `src/app/(app)/salah/page.tsx`
- `src/components/salah/SalahTodayInstrument.tsx`
- `src/components/salah/SalahLogCard.tsx`
- `src/components/salah/StatusPicker.tsx`
- `src/components/salah/JamaatToggle.tsx`
- `src/components/salah/SalahStreakCard.tsx`
- `src/components/salah/SalahWeekGrid.tsx`
- `src/components/salah/SalahMonthCard.tsx`
- `src/components/salah/SalahTallyCard.tsx`
- `src/components/salah/SalahSettingsForm.tsx`
- `src/components/home/SalahGlance.tsx`

**Modified:**
- `package.json` / lockfile — add `adhan`.
- `src/lib/domain/home-overview.ts` — add `salahDaySummary` + `SalahDaySummary`.
- `src/lib/domain/__tests__/home-overview.test.ts` — add `salahDaySummary` tests.
- `src/app/(app)/page.tsx` — query + wire + render `SalahGlance`.
- `src/app/(app)/settings/page.tsx` (+ settings section) — mount `SalahSettingsForm`.
- `src/app/(app)/layout.tsx` — sidebar `/salah` entry.
- `src/lib/database.types.ts` — regenerated via `npm run db:types`.
- `src/types/index.ts` — shared `Salah*` types if needed.

**Reused (unchanged):**
- `src/lib/domain/timezone.ts` — `toUserDate`, `userDayBounds`.
- `src/components/today/WidgetCard.tsx` — `WidgetCard`, `WidgetEmpty`, `WidgetLink`.
- `date-fns-tz` — `formatInTimeZone`.
