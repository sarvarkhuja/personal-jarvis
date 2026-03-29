# TECHNICAL REQUIREMENTS DOCUMENT
## Personal Training Tracker App
### Stack: Next.js 14+ (App Router) · Supabase · Vercel

---

## 1 — PRODUCT OVERVIEW

A mobile-first web application that allows the user to follow, log, and track their 12-week periodised training programme. The app replaces a paper logbook with structured workout tracking, progressive overload guidance, body metrics logging, nutrition tracking, and visual progress analytics.

**Target user:** Single user (the athlete). No multi-tenancy required in v1, but auth is implemented via Supabase for data security and future expandability.

---

## 2 — CORE FEATURES (MVP — v1.0)

### F1: Authentication
- Email/password sign-up and login via Supabase Auth
- OAuth optional (Google) for convenience
- Protected routes — all app pages require authentication
- Persistent session with Supabase SSR helpers (`@supabase/ssr`)

### F2: Programme Viewer
- Display the full 12-week programme organized by Block → Week → Day → Exercises
- Current week and current day highlighted automatically based on the programme start date
- Each exercise shows: name, prescribed sets × reps, tempo, rest period, and coach notes (why selected)
- Deload weeks visually distinguished (different color/badge)
- Block transitions (A→B→C) shown with exercise swap callouts

### F3: Workout Logger
- User opens today's session and sees the prescribed exercises pre-loaded
- For each exercise, the user logs per set:
  - **Weight (kg)** — numeric input with +/- stepper buttons (increment: 0.5 kg)
  - **Reps completed** — numeric input with +/- stepper
  - **RIR (Reps in Reserve)** — optional, dropdown 0–5
  - **Set status** — completed / failed / skipped
- "Add Set" button if user wants extra sets beyond prescription
- "Notes" free-text field per exercise (e.g., "felt heavy", "grip slipped")
- Session timer — starts when the user begins the workout, shows elapsed time
- Rest timer — starts automatically after logging a set, configurable per exercise (pre-filled from programme data), audible/vibration alert when rest period ends
- "Finish Workout" button → saves the session and shows a summary card

### F4: Progressive Overload Tracker
- After completing a week, the app suggests next week's weights based on the overload strategy:
  - If all prescribed reps were hit → suggest +2.5 kg (barbell) or +1 kg (dumbbell)
  - If reps were not hit → suggest same weight, aim for more reps
  - During deload weeks → auto-calculate 60% of last working weight
- Visual indicator per exercise: ↑ weight increased, → same weight, ↓ deload
- History of weight used per exercise shown as a mini sparkline chart

### F5: Body Metrics Tracker
- Daily log: **bodyweight** (kg), **date**, optional **notes**
- Weekly average auto-calculated and displayed
- Weight trend chart (line graph) with target line at 80 kg
- Optional fields: waist measurement, arm measurement, leg measurement (all in cm)
- Progress photo upload (stored in Supabase Storage) — tagged by date, pose (front/side/back)

### F6: Nutrition Tracker (Simplified)
- Daily log: **calories**, **protein (g)**, **carbs (g)**, **fat (g)**
- Target line overlaid on the chart (3,100 kcal / 155P / 400C / 90F)
- Weekly average macros displayed
- Simple "Quick Add" for supplements (1 scoop gainer = pre-filled macros, 1 scoop whey = pre-filled macros)
- No meal-by-meal breakdown in v1 — just daily totals

### F7: Dashboard / Home
- Today's workout card — tap to start logging
- Current block / week / day indicator
- This week's completion status (4 circles, filled when session logged)
- Bodyweight trend (last 14 days mini chart)
- Streak counter (consecutive days programme followed)
- Next session preview

### F8: Analytics & Progress
- **Strength progression charts** — line chart per exercise over 12 weeks (weight × reps)
- **Volume load chart** — total kg lifted per session/week (sets × reps × weight)
- **Bodyweight chart** — daily points + 7-day moving average + 80 kg target line
- **Muscle group volume** — bar chart showing weekly sets per muscle group vs. recommended
- **Personal records (PRs)** — auto-detected, badge/notification when a new PR is hit
- **Block comparison** — compare average weights between Block A, B, and C

### F9: Rest Timer (Standalone Utility)
- Accessible from any screen as a floating button
- Configurable presets: 60s, 90s, 120s, 180s, custom
- Vibration + sound alert on completion
- Visible countdown overlay

### F10: Settings
- Programme start date (used to calculate current week/day)
- Unit preference (kg/lbs — default kg)
- Rest timer default durations
- Notification preferences
- Export data as CSV/JSON
- Delete account / clear all data

---

## 3 — TECH STACK DETAILS

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Framework** | Next.js (App Router) | 14.x or 15.x | Server Components by default, Client Components where interactivity needed |
| **Language** | TypeScript | 5.x | Strict mode enabled |
| **Styling** | Tailwind CSS | 3.x or 4.x | Mobile-first, dark mode support |
| **UI Components** | shadcn/ui | Latest | Radix primitives + Tailwind styling, accessible by default |
| **Charts** | Recharts or Chart.js | Latest | For strength/bodyweight/volume charts |
| **State Management** | React hooks + URL state | — | No Redux needed; use `useState`, `useReducer`, `nuqs` for URL params |
| **Forms** | React Hook Form + Zod | Latest | Schema validation on client and server |
| **Backend/DB** | Supabase | Latest | Postgres DB, Auth, Storage, Realtime (optional) |
| **ORM/Query** | Supabase JS Client | `@supabase/supabase-js` v2 | Direct queries; consider Drizzle ORM if schema grows complex |
| **Auth** | Supabase Auth | via `@supabase/ssr` | Server-side session, middleware-protected routes |
| **File Storage** | Supabase Storage | — | Progress photos, exported files |
| **Hosting** | Vercel | — | Auto-deploy from GitHub, preview deploys on PRs |
| **CI/CD** | Vercel + GitHub Actions | — | Lint, type-check, test on PR; deploy on merge to main |
| **Analytics** | Vercel Analytics | — | Core Web Vitals, page views |
| **PWA** | next-pwa or Serwist | — | Installable on phone, offline workout logging |

---

## 4 — DATABASE SCHEMA (Supabase / PostgreSQL)

```sql
-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  height_cm NUMERIC(5,1),
  target_weight_kg NUMERIC(5,1),
  programme_start_date DATE NOT NULL,
  unit_preference TEXT DEFAULT 'kg' CHECK (unit_preference IN ('kg', 'lbs')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PROGRAMME STRUCTURE
-- ============================================
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,               -- 'Block A', 'Block B', 'Block C'
  description TEXT,
  week_start INT NOT NULL,          -- 1, 5, 9
  week_end INT NOT NULL,            -- 4, 8, 12
  focus TEXT,                       -- 'Anatomical Hypertrophy', etc.
  rep_range_compounds TEXT,         -- '8-10', '5-7', '3-5'
  rep_range_accessories TEXT,       -- '10-15', '8-12', '10-15'
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.programme_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,         -- 1=Mon, 2=Tue, 4=Thu, 5=Fri
  name TEXT NOT NULL,               -- 'Lower Body A — Quad & Calf Focus'
  emphasis TEXT,                    -- 'Quad & Calf Focus'
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.programme_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_day_id UUID REFERENCES public.programme_days(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INT NOT NULL,
  reps_min INT NOT NULL,            -- e.g. 8
  reps_max INT NOT NULL,            -- e.g. 10
  tempo TEXT,                       -- '3-1-1-0'
  rest_seconds INT NOT NULL,        -- 90, 120, 180
  rest_category TEXT,               -- 'short', 'moderate', 'long'
  coach_note TEXT,                  -- Why this exercise was selected
  muscle_groups TEXT[],             -- ARRAY['quads', 'glutes']
  is_timed BOOLEAN DEFAULT FALSE,   -- For farmer's walks, dead hangs
  time_seconds INT,                 -- Duration for timed exercises
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- WORKOUT LOGGING
-- ============================================
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  programme_day_id UUID REFERENCES public.programme_days(id),
  block_id UUID REFERENCES public.blocks(id),
  week_number INT NOT NULL,         -- 1–12
  session_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_minutes INT,
  is_deload BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  programme_exercise_id UUID REFERENCES public.programme_exercises(id),
  exercise_name TEXT NOT NULL,      -- Denormalized for quick reads
  set_number INT NOT NULL,
  weight_kg NUMERIC(6,2),
  reps_completed INT,
  rir INT,                          -- Reps in Reserve (0–5)
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'skipped', 'warmup')),
  is_pr BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- BODY METRICS
-- ============================================
CREATE TABLE public.body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,2),
  waist_cm NUMERIC(5,1),
  arm_cm NUMERIC(5,1),
  leg_cm NUMERIC(5,1),
  forearm_cm NUMERIC(5,1),
  calf_cm NUMERIC(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ============================================
-- PROGRESS PHOTOS
-- ============================================
CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pose TEXT CHECK (pose IN ('front_relaxed', 'front_flexed', 'side', 'back_relaxed', 'back_flexed')),
  storage_path TEXT NOT NULL,       -- Supabase Storage path
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DAILY NUTRITION
-- ============================================
CREATE TABLE public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calories INT,
  protein_g NUMERIC(5,1),
  carbs_g NUMERIC(5,1),
  fat_g NUMERIC(5,1),
  supplements_used TEXT[],          -- ARRAY['gainer', 'whey', 'creatine']
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ============================================
-- PERSONAL RECORDS
-- ============================================
CREATE TABLE public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL,
  reps INT NOT NULL,
  estimated_1rm NUMERIC(6,2),       -- Epley formula: weight × (1 + reps/30)
  achieved_date DATE NOT NULL,
  session_id UUID REFERENCES public.workout_sessions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_sessions_user_date ON public.workout_sessions(user_id, session_date DESC);
CREATE INDEX idx_sessions_week ON public.workout_sessions(user_id, week_number);
CREATE INDEX idx_sets_session ON public.workout_sets(session_id);
CREATE INDEX idx_sets_exercise ON public.workout_sets(exercise_name, created_at DESC);
CREATE INDEX idx_body_metrics_user_date ON public.body_metrics(user_id, date DESC);
CREATE INDEX idx_nutrition_user_date ON public.nutrition_logs(user_id, date DESC);
CREATE INDEX idx_prs_user_exercise ON public.personal_records(user_id, exercise_name);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their own data
CREATE POLICY "Users access own data" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users access own sessions" ON public.workout_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own sets" ON public.workout_sets
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.workout_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users access own metrics" ON public.body_metrics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own photos" ON public.progress_photos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own nutrition" ON public.nutrition_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own prs" ON public.personal_records
  FOR ALL USING (auth.uid() = user_id);

-- Programme tables are public read (seeded data)
-- No RLS needed — or use a simple "allow read for authenticated" policy
```

---

## 5 — APPLICATION ARCHITECTURE

### 5.1 — Directory Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── layout.tsx                  # Authenticated layout with nav
│   │   ├── page.tsx                    # Dashboard / Home (F7)
│   │   ├── programme/
│   │   │   ├── page.tsx                # Full programme viewer (F2)
│   │   │   └── [weekNumber]/
│   │   │       └── [dayId]/page.tsx    # Single day view
│   │   ├── workout/
│   │   │   ├── page.tsx                # Today's session launcher
│   │   │   ├── [sessionId]/
│   │   │   │   ├── page.tsx            # Active workout logger (F3)
│   │   │   │   └── summary/page.tsx    # Post-workout summary
│   │   │   └── history/page.tsx        # Past sessions list
│   │   ├── body/
│   │   │   ├── page.tsx                # Body metrics + photos (F5)
│   │   │   └── photos/page.tsx         # Photo gallery
│   │   ├── nutrition/
│   │   │   └── page.tsx                # Nutrition log (F6)
│   │   ├── analytics/
│   │   │   └── page.tsx                # Charts & progress (F8)
│   │   └── settings/
│   │       └── page.tsx                # Settings (F10)
│   ├── api/
│   │   ├── seed-programme/route.ts     # One-time programme seed endpoint
│   │   └── export/route.ts             # CSV/JSON export
│   ├── layout.tsx                      # Root layout
│   └── globals.css
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── workout/
│   │   ├── SetLogger.tsx               # Per-set input row
│   │   ├── ExerciseCard.tsx            # Exercise block with sets
│   │   ├── RestTimer.tsx               # Countdown timer
│   │   ├── SessionTimer.tsx            # Elapsed time
│   │   └── WorkoutSummary.tsx          # Post-session card
│   ├── charts/
│   │   ├── StrengthChart.tsx           # Weight over time per exercise
│   │   ├── BodyweightChart.tsx         # Weight trend + target
│   │   ├── VolumeChart.tsx             # Volume load per week
│   │   └── MuscleVolumeChart.tsx       # Sets per muscle group
│   ├── programme/
│   │   ├── BlockCard.tsx
│   │   ├── WeekView.tsx
│   │   └── ExerciseRow.tsx
│   ├── nutrition/
│   │   ├── MacroInput.tsx
│   │   └── QuickAddButton.tsx
│   └── layout/
│       ├── BottomNav.tsx               # Mobile bottom navigation
│       ├── Header.tsx
│       └── FloatingRestTimer.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   ├── server.ts                   # Server client (cookies)
│   │   └── middleware.ts               # Auth middleware helper
│   ├── utils/
│   │   ├── overload.ts                 # Progressive overload calculation logic
│   │   ├── pr-detector.ts              # Compare set against PR table
│   │   ├── estimated-1rm.ts            # Epley formula
│   │   ├── deload-calculator.ts        # 60% working weight calc
│   │   └── week-calculator.ts          # Current week/day from start date
│   ├── validators/
│   │   ├── workout.ts                  # Zod schemas for workout forms
│   │   ├── body-metrics.ts
│   │   └── nutrition.ts
│   └── constants/
│       ├── programme-data.ts           # Full 12-week programme as typed objects
│       └── supplement-macros.ts        # Quick-add presets
├── hooks/
│   ├── useRestTimer.ts
│   ├── useSessionTimer.ts
│   ├── useCurrentWeek.ts
│   └── useWorkoutSession.ts
├── types/
│   └── index.ts                        # All TypeScript interfaces/types
└── middleware.ts                        # Next.js middleware for auth redirect
```

### 5.2 — Key Architectural Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **Rendering** | Server Components default, Client Components for interactive UI | Reduces JS bundle; workout logger, timers, and charts are client-side |
| **Data fetching** | Server Components use Supabase server client; mutations use Server Actions | No API routes needed for CRUD; Server Actions handle form submissions |
| **Offline support** | Service Worker (PWA) + IndexedDB queue | User may be in a gym basement with no signal; log sets offline, sync when back online |
| **Programme data** | Seeded into Supabase via a one-time seed script | Programme is static; stored in DB so it can be queried relationally with logs |
| **Real-time** | Not needed for v1 | Single user; no collaborative features |
| **Image optimization** | Next.js `<Image>` + Supabase Storage transforms | Progress photos resized on upload; thumbnails generated |

---

## 6 — API / SERVER ACTIONS DESIGN

All data mutations use Next.js Server Actions (no REST API needed for v1).

### Server Actions

```
actions/
├── auth.ts
│   ├── signUp(formData)
│   ├── signIn(formData)
│   └── signOut()
├── workout.ts
│   ├── startSession(programDayId, weekNumber)    → returns sessionId
│   ├── logSet(sessionId, exerciseId, setData)    → upserts set
│   ├── finishSession(sessionId)                  → calculates duration, checks PRs
│   └── deleteSession(sessionId)
├── body.ts
│   ├── logBodyMetrics(date, metricsData)         → upserts for date
│   ├── uploadProgressPhoto(file, date, pose)     → uploads to storage + inserts row
│   └── deletePhoto(photoId)
├── nutrition.ts
│   ├── logNutrition(date, macroData)             → upserts for date
│   └── quickAddSupplement(date, supplementType)  → adds preset macros to daily total
├── programme.ts
│   └── seedProgramme()                           → one-time seed from constants
└── settings.ts
    ├── updateProfile(profileData)
    └── exportData(format: 'csv' | 'json')        → generates download
```

---

## 7 — PWA & OFFLINE STRATEGY

### Why PWA is Critical
The user is in a gym. Phone signal may be weak. The app must work offline for the core workflow: logging sets.

### Implementation

| Concern | Solution |
|---------|----------|
| **Installable** | Web manifest with icons, `display: standalone`, theme color |
| **Offline logging** | Service Worker caches the app shell; workout logging writes to IndexedDB first, syncs to Supabase when online |
| **Sync** | Background Sync API or manual sync button; conflict resolution: last-write-wins (single user) |
| **Cached pages** | Dashboard, current workout, programme viewer cached via service worker |
| **Timer** | Rest timer runs entirely client-side; works offline; uses Web Vibration API for alerts |

### Service Worker Caching Strategy

```
Cache-first:  Static assets (JS, CSS, fonts, icons)
Network-first: API data (workout history, metrics)
Stale-while-revalidate: Programme data (rarely changes)
```

---

## 8 — KEY BUSINESS LOGIC

### 8.1 — Progressive Overload Calculator

```typescript
// lib/utils/overload.ts
interface OverloadSuggestion {
  suggestedWeightKg: number;
  strategy: 'increase_weight' | 'increase_reps' | 'deload' | 'same_weight';
  reason: string;
}

function calculateOverload(
  lastSessionSets: SetLog[],
  prescribedRepsMin: number,
  prescribedRepsMax: number,
  isDeloadWeek: boolean,
  equipmentType: 'barbell' | 'dumbbell' | 'machine'
): OverloadSuggestion {
  if (isDeloadWeek) {
    return {
      suggestedWeightKg: lastSessionSets[0].weight_kg * 0.6,
      strategy: 'deload',
      reason: 'Deload week: 60% of working weight'
    };
  }

  const allSetsHitMaxReps = lastSessionSets
    .filter(s => s.status === 'completed')
    .every(s => s.reps_completed >= prescribedRepsMax);

  if (allSetsHitMaxReps) {
    const increment = equipmentType === 'barbell' ? 2.5 
                    : equipmentType === 'dumbbell' ? 1.0 
                    : 2.5;
    return {
      suggestedWeightKg: lastSessionSets[0].weight_kg + increment,
      strategy: 'increase_weight',
      reason: `All sets hit ${prescribedRepsMax} reps → +${increment} kg`
    };
  }

  return {
    suggestedWeightKg: lastSessionSets[0].weight_kg,
    strategy: 'increase_reps',
    reason: `Aim for ${prescribedRepsMax} reps on all sets before adding weight`
  };
}
```

### 8.2 — PR Detection

```typescript
// lib/utils/pr-detector.ts
function checkForPR(
  exerciseName: string,
  weightKg: number,
  reps: number,
  existingPRs: PersonalRecord[]
): { isPR: boolean; type: 'weight' | '1rm_estimate' | null } {
  const estimated1RM = weightKg * (1 + reps / 30); // Epley formula
  
  const existingBest = existingPRs.find(p => p.exercise_name === exerciseName);
  
  if (!existingBest) return { isPR: true, type: 'weight' };
  
  if (estimated1RM > (existingBest.estimated_1rm || 0)) {
    return { isPR: true, type: '1rm_estimate' };
  }
  
  if (weightKg > existingBest.weight_kg) {
    return { isPR: true, type: 'weight' };
  }
  
  return { isPR: false, type: null };
}
```

### 8.3 — Current Week/Day Calculator

```typescript
// lib/utils/week-calculator.ts
function getCurrentProgrammePosition(startDate: Date): {
  weekNumber: number;       // 1–12
  blockName: string;        // 'A', 'B', 'C'
  isDeloadWeek: boolean;
  dayOfWeek: number;        // 1–7
  isTrainingDay: boolean;   // Mon, Tue, Thu, Fri = true
} {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weekNumber = Math.min(Math.floor(diffDays / 7) + 1, 12);
  const blockName = weekNumber <= 4 ? 'A' : weekNumber <= 8 ? 'B' : 'C';
  const isDeloadWeek = weekNumber === 4 || weekNumber === 8;
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const trainingDays = [1, 2, 4, 5]; // Mon, Tue, Thu, Fri
  
  return {
    weekNumber,
    blockName,
    isDeloadWeek,
    dayOfWeek,
    isTrainingDay: trainingDays.includes(dayOfWeek)
  };
}
```

---

## 9 — UI/UX REQUIREMENTS

### 9.1 — Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Mobile-first** | Designed for one-handed phone use in the gym; large tap targets (min 44px); bottom navigation |
| **Dark mode default** | Easier on eyes in gym lighting; toggle available |
| **Minimal taps to log** | Logging a set should take ≤3 taps: weight → reps → confirm |
| **Glanceable** | Dashboard shows status at a glance; use color coding (green = on track, yellow = behind, red = missed) |
| **Fast** | App shell cached; page transitions <200ms; no loading spinners for cached data |

### 9.2 — Key Screens (Wireframe Descriptions)

**Dashboard (Home)**
```
┌──────────────────────────────────┐
│  WEEK 3 of 12 · Block A          │
│  ████████░░░░░░░░░░░░  25%       │
├──────────────────────────────────┤
│  TODAY: Lower Body A              │
│  Quad & Calf Focus                │
│  [  START WORKOUT  ]              │
├──────────────────────────────────┤
│  This Week:  ● ● ○ ○             │
│              M  T  Th F           │
├──────────────────────────────────┤
│  Weight: 72.4 kg  (+2.4)  ↗      │
│  ▁▂▂▃▃▃▄▄ (mini sparkline)       │
│  Target: 80 kg                    │
├──────────────────────────────────┤
│  🔥 Streak: 12 days               │
├──────────────────────────────────┤
│  [Programme] [Body] [Nutrition]   │
└──────────────────────────────────┘
```

**Workout Logger (Active Session)**
```
┌──────────────────────────────────┐
│  ← Back          Session: 42:15   │
│  Lower Body A · Week 3            │
├──────────────────────────────────┤
│  1. BARBELL BACK SQUAT            │
│  4 × 8–10 · Tempo: 3-1-1-0       │
│  Rest: 2–3 min · Last: 80 kg     │
│  ┌────────────────────────────┐   │
│  │ Set 1:  80 kg × 10  ✓ RIR:2│  │
│  │ Set 2:  80 kg × 9   ✓ RIR:2│  │
│  │ Set 3:  [82.5] × [__] [LOG]│  │
│  │ Set 4:  —                   │  │
│  └────────────────────────────┘   │
│                                   │
│  ⏱ REST: 1:42 remaining          │
│  [Skip Rest]                      │
│                                   │
│  ▼ 2. Bulgarian Split Squat      │
│  ▼ 3. Leg Press                  │
│  ▼ 4. Leg Extension              │
│  ...                              │
│                                   │
│  [FINISH WORKOUT]                 │
└──────────────────────────────────┘
```

### 9.3 — Navigation

**Bottom Tab Bar (Mobile)**
```
[ Home ] [ Workout ] [ Programme ] [ Body ] [ More ]
```

"More" opens a sheet with: Analytics, Nutrition, Settings.

---

## 10 — NON-FUNCTIONAL REQUIREMENTS

| Requirement | Target | How |
|-------------|--------|-----|
| **Performance** | LCP < 1.5s, FID < 100ms, CLS < 0.1 | Server Components, image optimization, code splitting |
| **Offline** | Core workout logging works without network | PWA + IndexedDB queue |
| **Accessibility** | WCAG 2.1 AA | shadcn/ui (Radix primitives), semantic HTML, contrast ratios |
| **Security** | All user data isolated | Supabase RLS policies, server-side auth checks |
| **Data integrity** | No lost workout data | Optimistic UI + local-first writes + background sync |
| **Responsive** | Usable on 320px–1440px | Tailwind breakpoints, mobile-first CSS |
| **Bundle size** | JS < 150 KB (first load) | Dynamic imports for charts, tree-shaking |
| **Uptime** | 99.9% | Vercel edge network + Supabase managed infra |

---

## 11 — DEPLOYMENT & ENVIRONMENT

### Vercel Configuration

```
Environment Variables (Vercel Dashboard):
├── NEXT_PUBLIC_SUPABASE_URL        = https://xxxxx.supabase.co
├── NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...
├── SUPABASE_SERVICE_ROLE_KEY       = eyJ... (server-only, for seed scripts)
└── NEXT_PUBLIC_APP_URL             = https://your-app.vercel.app
```

### Branch Strategy

| Branch | Purpose | Deploy |
|--------|---------|--------|
| `main` | Production | Auto-deploy to production URL |
| `develop` | Staging/integration | Preview deploy |
| `feature/*` | Feature branches | Preview deploy per PR |

### CI Pipeline (on PR to main)

```
1. TypeScript type-check (tsc --noEmit)
2. ESLint
3. Unit tests (Vitest)
4. Build check (next build)
5. Preview deploy (Vercel)
```

---

## 12 — DEVELOPMENT PHASES

| Phase | Scope | Est. Time |
|-------|-------|-----------|
| **Phase 1** | Auth + Dashboard + Programme Viewer + DB schema + seed data | 1 week |
| **Phase 2** | Workout Logger (core loop: start session → log sets → finish) + rest timer | 1.5 weeks |
| **Phase 3** | Progressive overload logic + PR detection + weight suggestions | 0.5 week |
| **Phase 4** | Body metrics + nutrition logging | 1 week |
| **Phase 5** | Analytics & charts (strength, volume, bodyweight, muscle group) | 1 week |
| **Phase 6** | PWA (offline support, installable, background sync) | 1 week |
| **Phase 7** | Progress photos (upload, gallery, storage) | 0.5 week |
| **Phase 8** | Polish, settings, export, testing, performance optimization | 1 week |
| **Total** | | **~7.5 weeks** |

---

## 13 — FUTURE FEATURES (v2.0+)

- **AI Coach:** Chat with Claude API to get form advice, programme adjustments, and plateau-breaking suggestions based on logged data
- **Exercise video library:** Embedded short-form videos demonstrating each exercise with correct form
- **Social / accountability:** Share progress with a training partner or coach
- **Nutrition barcode scanner:** Scan food items to auto-fill macros
- **Apple Health / Google Fit integration:** Sync bodyweight and activity data
- **Custom programme builder:** Allow user to modify or create new programmes after the initial 12 weeks
- **Multi-programme support:** Store multiple 12-week cycles and compare results between them
- **Wearable integration:** Heart rate during workouts, sleep quality tracking
