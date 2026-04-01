# Jarvis Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/` training dashboard with a full Command Centre life-OS (Expenses, Goals, Focus, Discipline, Workout tabs) backed by 7 new Supabase tables.

**Architecture:** Server component fetches all tab data in parallel via `Promise.all`, passes typed props to `<JarvisDashboard>` (client component) which handles tab switching via `useState`. All mutations go through server actions that call `revalidatePath('/')` to refresh data.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase SSR, shadcn/ui, Tailwind CSS 4, Recharts

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/002_jarvis_tables.sql` | Create | 7 new tables + RLS |
| `src/types/index.ts` | Modify | Add 7 new interfaces |
| `src/lib/utils/dashboard-utils.ts` | Create | Streak calc + expense aggregation |
| `src/lib/utils/__tests__/dashboard-utils.test.ts` | Create | Unit tests for utils |
| `src/actions/expenses.ts` | Create | addExpense, deleteExpense |
| `src/actions/goals.ts` | Create | addGoal, updateGoalProgress, completeGoal |
| `src/actions/focus.ts` | Create | addFocusArea, toggleCheckin |
| `src/actions/discipline.ts` | Create | toggleHabitCompletion, saveDisciplineScore, addHabit |
| `src/components/dashboard/JarvisDashboard.tsx` | Create | Client shell: header + tab bar + tab router |
| `src/components/dashboard/tabs/WorkoutTab.tsx` | Create | Extracted workout content from old page.tsx |
| `src/components/dashboard/tabs/OverviewTab.tsx` | Create | 4 stat cards + all domain summaries |
| `src/components/dashboard/tabs/ExpensesTab.tsx` | Create | Recharts bar chart + category bars + form + list |
| `src/components/dashboard/tabs/GoalsTab.tsx` | Create | Goal list with progress bars + add form |
| `src/components/dashboard/tabs/FocusTab.tsx` | Create | 30-day dot grid + check-in toggle |
| `src/components/dashboard/tabs/DisciplineTab.tsx` | Create | Habit grid + score entry + Recharts line chart |
| `src/app/(app)/page.tsx` | Rewrite | Parallel data fetch (explicit select) → JarvisDashboard |
| `src/app/(app)/layout.tsx` | Rewrite | Apply Nothing-design UI shell and fonts |

---

## Task 1: Install Recharts

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

Expected output: `added N packages` with recharts in dependencies.

- [ ] **Step 2: Verify**

```bash
node -e "require('recharts'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add recharts for dashboard charts"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/002_jarvis_tables.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/002_jarvis_tables.sql`:

```sql
-- supabase/migrations/002_jarvis_tables.sql
-- Run in Supabase Dashboard → SQL Editor

-- ============================================
-- EXPENSES
-- ============================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_pence INT NOT NULL,  -- store in pence, e.g. £8.42 = 842
  currency TEXT DEFAULT 'GBP',
  category TEXT NOT NULL CHECK (category IN ('food','transport','shopping','entertainment','health','other')),
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_expenses_user_date ON public.expenses (user_id, date DESC);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own expenses" ON public.expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- GOALS
-- ============================================
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,  -- 'kg', 'books', '£', etc.
  deadline DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FOCUS AREAS
-- ============================================
CREATE TABLE public.focus_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎯',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.focus_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own focus areas" ON public.focus_areas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FOCUS CHECKINS
-- ============================================
CREATE TABLE public.focus_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  focus_area_id UUID REFERENCES public.focus_areas(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, focus_area_id, date)
);
CREATE INDEX idx_focus_checkins_user_date ON public.focus_checkins (user_id, date DESC);
ALTER TABLE public.focus_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own focus checkins" ON public.focus_checkins
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HABITS
-- ============================================
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '✅',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own habits" ON public.habits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HABIT COMPLETIONS
-- ============================================
CREATE TABLE public.habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, habit_id, date)
);
CREATE INDEX idx_habit_completions_user_date ON public.habit_completions (user_id, date DESC);
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own habit completions" ON public.habit_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DISCIPLINE SCORES
-- ============================================
CREATE TABLE public.discipline_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX idx_discipline_scores_user_date ON public.discipline_scores (user_id, date DESC);
ALTER TABLE public.discipline_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own discipline scores" ON public.discipline_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration**

Go to Supabase Dashboard → SQL Editor → paste and run the migration, OR:

```bash
# If using Supabase CLI locally:
supabase db push
```

- [ ] **Step 3: Verify tables exist**

In Supabase Dashboard → Table Editor, confirm these 7 tables exist: `expenses`, `goals`, `focus_areas`, `focus_checkins`, `habits`, `habit_completions`, `discipline_scores`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_jarvis_tables.sql
git commit -m "feat: add jarvis dashboard DB tables (expenses, goals, focus, habits, discipline)"
```

---

## Task 3: TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add 7 new interfaces at the end of the file**

Append to `src/types/index.ts`:

```typescript
export interface Expense {
  id: string
  user_id: string
  amount_pence: number
  currency: string
  category: 'food' | 'transport' | 'shopping' | 'entertainment' | 'health' | 'other'
  description: string | null
  date: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  target_value: number | null
  current_value: number
  unit: string | null
  deadline: string | null
  status: 'active' | 'completed' | 'paused'
  created_at: string
}

export interface FocusArea {
  id: string
  user_id: string
  name: string
  emoji: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface FocusCheckin {
  id: string
  user_id: string
  focus_area_id: string
  date: string
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  emoji: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface HabitCompletion {
  id: string
  user_id: string
  habit_id: string
  date: string
  created_at: string
}

export interface DisciplineScore {
  id: string
  user_id: string
  date: string
  score: number
  notes: string | null
  created_at: string
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript interfaces for jarvis dashboard entities"
```

---

## Task 4: Dashboard Utility Functions + Tests

**Files:**
- Create: `src/lib/utils/dashboard-utils.ts`
- Create: `src/lib/utils/__tests__/dashboard-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/utils/__tests__/dashboard-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  calcStreak,
  calcOverallFocusStreak,
  aggregateExpensesByMonth,
  calcHabitStreak,
} from '../dashboard-utils'

describe('calcStreak', () => {
  it('returns 0 when no checkins', () => {
    expect(calcStreak([], '2026-03-29')).toBe(0)
  })

  it('returns 1 for single checkin today', () => {
    expect(calcStreak(['2026-03-29'], '2026-03-29')).toBe(1)
  })

  it('counts consecutive days ending today', () => {
    expect(calcStreak(['2026-03-27', '2026-03-28', '2026-03-29'], '2026-03-29')).toBe(3)
  })

  it('breaks streak on gap', () => {
    expect(calcStreak(['2026-03-25', '2026-03-28', '2026-03-29'], '2026-03-29')).toBe(2)
  })

  it('returns 0 if no checkin today', () => {
    expect(calcStreak(['2026-03-27', '2026-03-28'], '2026-03-29')).toBe(0)
  })
})

describe('calcOverallFocusStreak', () => {
  it('counts consecutive days with at least one checkin', () => {
    const dates = ['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-29']
    expect(calcOverallFocusStreak(dates, '2026-03-29')).toBe(3)
  })
})

describe('aggregateExpensesByMonth', () => {
  it('sums pence by YYYY-MM key', () => {
    const expenses = [
      { date: '2026-03-01', amount_pence: 1000 },
      { date: '2026-03-15', amount_pence: 500 },
      { date: '2026-02-10', amount_pence: 2000 },
    ]
    const result = aggregateExpensesByMonth(expenses)
    expect(result['2026-03']).toBe(1500)
    expect(result['2026-02']).toBe(2000)
  })
})

describe('calcHabitStreak', () => {
  it('counts consecutive completions ending today', () => {
    expect(calcHabitStreak(['2026-03-28', '2026-03-29'], '2026-03-29')).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/utils/__tests__/dashboard-utils.test.ts
```

Expected: FAIL — `Cannot find module '../dashboard-utils'`

- [ ] **Step 3: Implement the utility functions**

Create `src/lib/utils/dashboard-utils.ts`:

```typescript
/**
 * Calculate streak for a single entity (focus area or habit).
 * Counts consecutive days ending on `today` where a checkin/completion exists.
 */
export function calcStreak(dates: string[], today: string): number {
  const dateSet = new Set(dates)
  let streak = 0
  const d = new Date(today)
  while (dateSet.has(d.toISOString().split('T')[0])) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/**
 * Calculate overall focus streak: consecutive days ending on `today`
 * where the user checked in at least one focus area.
 */
export function calcOverallFocusStreak(allCheckinDates: string[], today: string): number {
  return calcStreak(allCheckinDates, today)
}

/**
 * Alias for calcStreak — used for habit completion streaks.
 */
export function calcHabitStreak(completionDates: string[], today: string): number {
  return calcStreak(completionDates, today)
}

/**
 * Aggregate expenses by month (YYYY-MM key), returning total amount_pence per month.
 */
export function aggregateExpensesByMonth(
  expenses: { date: string; amount_pence: number }[]
): Record<string, number> {
  return expenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.date.slice(0, 7) // 'YYYY-MM'
    acc[key] = (acc[key] ?? 0) + e.amount_pence
    return acc
  }, {})
}

/**
 * Build last N month YYYY-MM keys in ascending order, ending with the current month.
 */
export function lastNMonthKeys(n: number): string[] {
  const keys: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const month = new Date(d.getFullYear(), d.getMonth() - i, 1)
    keys.push(month.toISOString().slice(0, 7))
  }
  return keys
}

/** Format pence as £ string: 842 → "£8.42" */
export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/utils/__tests__/dashboard-utils.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/dashboard-utils.ts src/lib/utils/__tests__/dashboard-utils.test.ts
git commit -m "feat: add dashboard utility functions with tests"
```

---

## Task 5: Server Actions — Expenses

**Files:**
- Create: `src/actions/expenses.ts`

- [ ] **Step 1: Create the server action file**

Create `src/actions/expenses.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amountStr = formData.get('amount') as string
  const amount_pence = Math.round(parseFloat(amountStr) * 100)
  if (isNaN(amount_pence) || amount_pence <= 0) return { error: 'Invalid amount' }

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    amount_pence,
    category: formData.get('category') as string,
    description: (formData.get('description') as string) || null,
    date: formData.get('date') as string,
  })

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/expenses.ts
git commit -m "feat: add expense server actions"
```

---

## Task 6: Server Actions — Goals

**Files:**
- Create: `src/actions/goals.ts`

- [ ] **Step 1: Create the server action file**

Create `src/actions/goals.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const targetStr = formData.get('target_value') as string
  const target_value = targetStr ? parseFloat(targetStr) : null

  const { error } = await supabase.from('goals').insert({
    user_id: user.id,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    target_value,
    current_value: 0,
    unit: (formData.get('unit') as string) || null,
    deadline: (formData.get('deadline') as string) || null,
    status: 'active',
  })

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function updateGoalProgress(id: string, currentValue: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('goals')
    .update({ current_value: currentValue })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function completeGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('goals')
    .update({ status: 'completed' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/goals.ts
git commit -m "feat: add goal server actions"
```

---

## Task 7: Server Actions — Focus

**Files:**
- Create: `src/actions/focus.ts`

- [ ] **Step 1: Create the server action file**

Create `src/actions/focus.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addFocusArea(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('focus_areas').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    emoji: (formData.get('emoji') as string) || '🎯',
  })

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function toggleCheckin(focusAreaId: string, date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Check if checkin already exists
  const { data: existing } = await supabase
    .from('focus_checkins')
    .select('id')
    .eq('user_id', user.id)
    .eq('focus_area_id', focusAreaId)
    .eq('date', date)
    .single()

  if (existing) {
    // Remove checkin
    await supabase.from('focus_checkins').delete().eq('id', existing.id)
  } else {
    // Add checkin
    await supabase.from('focus_checkins').insert({
      user_id: user.id,
      focus_area_id: focusAreaId,
      date,
    })
  }

  revalidatePath('/')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/focus.ts
git commit -m "feat: add focus area server actions"
```

---

## Task 8: Server Actions — Discipline

**Files:**
- Create: `src/actions/discipline.ts`

- [ ] **Step 1: Create the server action file**

Create `src/actions/discipline.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addHabit(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('habits').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    emoji: (formData.get('emoji') as string) || '✅',
  })

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function toggleHabitCompletion(habitId: string, date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id')
    .eq('user_id', user.id)
    .eq('habit_id', habitId)
    .eq('date', date)
    .single()

  if (existing) {
    await supabase.from('habit_completions').delete().eq('id', existing.id)
  } else {
    await supabase.from('habit_completions').insert({
      user_id: user.id,
      habit_id: habitId,
      date,
    })
  }

  revalidatePath('/')
}

export async function saveDisciplineScore(date: string, score: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Upsert: insert or update if date already has a score
  const { error } = await supabase.from('discipline_scores').upsert(
    { user_id: user.id, date, score },
    { onConflict: 'user_id,date' }
  )

  if (error) return { error: error.message }
  revalidatePath('/')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/discipline.ts
git commit -m "feat: add discipline server actions"
```

---

## Task 9: WorkoutTab Component

**Files:**
- Create: `src/components/dashboard/tabs/WorkoutTab.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/tabs/WorkoutTab.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProgrammePosition } from '@/types'

const TRAINING_DAY_NAMES: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 4: 'Thu', 5: 'Fri',
}

const NEXT_TRAINING_DAY: Record<number, string> = {
  0: 'Monday', 1: 'Tuesday', 2: 'Thursday', 3: 'Thursday',
  4: 'Friday', 5: 'Monday', 6: 'Monday',
}

interface WorkoutTabProps {
  position: ProgrammePosition
  todayDay: { id: string; name: string; emphasis: string | null } | null
  completedDows: number[]
  latestWeight: { weight_kg: number | null; date: string } | null
  targetWeightKg: number | null
}

export function WorkoutTab({
  position,
  todayDay,
  completedDows,
  latestWeight,
  targetWeightKg,
}: WorkoutTabProps) {
  const progressPercent = Math.round((position.weekNumber / 12) * 100)
  const completedSet = new Set(completedDows)
  const trainingDayDows = [1, 2, 4, 5]

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Week progress */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs tracking-widest uppercase text-[#444]">
            Week Progress
          </span>
          <span className="font-mono text-xs text-[#444]">{progressPercent}%</span>
        </div>
        <div className="h-1 bg-[#111] rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-[#444]">
            Week {position.weekNumber} of 12 · Block {position.blockName}
          </span>
          {position.isDeloadWeek && (
            <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px] font-mono">
              DELOAD
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-2">Today</div>
          {position.isTrainingDay && todayDay ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-sm font-semibold text-green-400">{todayDay.name}</span>
              </div>
              {todayDay.emphasis && (
                <p className="font-mono text-xs text-[#555] mb-3">{todayDay.emphasis}</p>
              )}
              <Link href="/workout">
                <Button size="sm" className="w-full font-mono text-xs tracking-widest">
                  START WORKOUT
                </Button>
              </Link>
            </>
          ) : (
            <>
              <span className="font-mono text-sm text-[#444]">Rest Day</span>
              <p className="font-mono text-xs text-[#333] mt-1">
                Next: {NEXT_TRAINING_DAY[position.dayOfWeek]}
              </p>
            </>
          )}
        </div>

        {/* This week */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">This Week</div>
          <div className="flex gap-3">
            {trainingDayDows.map((dow) => {
              const done = completedSet.has(dow)
              return (
                <div key={dow} className="flex flex-col items-center gap-1">
                  <div className={`size-8 rounded-full flex items-center justify-center font-mono text-xs ${
                    done
                      ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                      : 'bg-[#111] border border-[#222] text-[#333]'
                  }`}>
                    {done ? '✓' : '·'}
                  </div>
                  <span className="font-mono text-[9px] text-[#333]">{TRAINING_DAY_NAMES[dow]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bodyweight */}
      {latestWeight?.weight_kg && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-2">Bodyweight</div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-bold text-green-400">
              {latestWeight.weight_kg}
              <span className="text-sm font-normal text-[#444] ml-1">kg</span>
            </span>
            <span className="font-mono text-xs text-[#333]">
              Target: {targetWeightKg ?? 80} kg
            </span>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Link href="/programme" className="font-mono text-[10px] tracking-widest uppercase text-[#444] hover:text-green-400 transition-colors">
          → View Full Programme
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/tabs/WorkoutTab.tsx
git commit -m "feat: add WorkoutTab component"
```

---

## Task 10: JarvisDashboard Shell

**Files:**
- Create: `src/components/dashboard/JarvisDashboard.tsx`

- [ ] **Step 1: Create the shell**

Create `src/components/dashboard/JarvisDashboard.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { ProgrammePosition, Goal, Expense, FocusArea, FocusCheckin, Habit, HabitCompletion, DisciplineScore } from '@/types'
import { WorkoutTab } from './tabs/WorkoutTab'
import { OverviewTab } from './tabs/OverviewTab'
import { ExpensesTab } from './tabs/ExpensesTab'
import { GoalsTab } from './tabs/GoalsTab'
import { FocusTab } from './tabs/FocusTab'
import { DisciplineTab } from './tabs/DisciplineTab'

type Tab = 'overview' | 'expenses' | 'goals' | 'focus' | 'discipline' | 'workout'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'goals', label: 'Goals' },
  { id: 'focus', label: 'Focus' },
  { id: 'discipline', label: 'Discipline' },
  { id: 'workout', label: 'Workout' },
]

export interface JarvisDashboardProps {
  displayName: string | null
  position: ProgrammePosition
  todayDay: { id: string; name: string; emphasis: string | null } | null
  completedDows: number[]
  latestWeight: { weight_kg: number | null; date: string } | null
  targetWeightKg: number | null
  goals: Goal[]
  expenses: Expense[]
  focusAreas: FocusArea[]
  focusCheckins: FocusCheckin[]
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  disciplineScores: DisciplineScore[]
  today: string  // ISO date string 'YYYY-MM-DD'
}

export function JarvisDashboard(props: JarvisDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const {
    displayName, position, today,
    todayDay, completedDows, latestWeight, targetWeightKg,
    goals, expenses, focusAreas, focusCheckins,
    habits, habitCompletions, disciplineScores,
  } = props

  const monthName = new Date(today).toLocaleString('en-GB', { month: 'short' }).toUpperCase()
  const dayName = new Date(today).toLocaleString('en-GB', { weekday: 'short' }).toUpperCase()
  const dateDisplay = new Date(today).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).toUpperCase()

  return (
    <div className="min-h-full bg-[#050505]">
      {/* Header */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="font-mono text-sm font-bold tracking-[0.3em] uppercase text-green-400">
              JARVIS
            </h1>
            <p className="font-mono text-[10px] tracking-widest text-[#333] mt-0.5">
              {dayName} · {dateDisplay} · WEEK {position.weekNumber} OF 12
            </p>
          </div>
          {displayName && (
            <div className="size-7 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center font-mono text-[10px] text-green-400">
              {displayName[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 px-6 mt-4 border-b border-[#111]">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`font-mono text-[9px] tracking-widest uppercase pb-2 px-3 border-b-2 transition-colors ${
              activeTab === id
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-[#333] hover:text-[#666]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-6 py-5">
        {activeTab === 'overview' && (
          <OverviewTab
            position={position}
            today={today}
            todayDay={todayDay}
            completedDows={completedDows}
            goals={goals}
            expenses={expenses}
            focusAreas={focusAreas}
            focusCheckins={focusCheckins}
            habits={habits}
            habitCompletions={habitCompletions}
            disciplineScores={disciplineScores}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab expenses={expenses} today={today} />
        )}
        {activeTab === 'goals' && (
          <GoalsTab goals={goals} today={today} />
        )}
        {activeTab === 'focus' && (
          <FocusTab
            focusAreas={focusAreas}
            focusCheckins={focusCheckins}
            today={today}
          />
        )}
        {activeTab === 'discipline' && (
          <DisciplineTab
            habits={habits}
            habitCompletions={habitCompletions}
            disciplineScores={disciplineScores}
            today={today}
          />
        )}
        {activeTab === 'workout' && (
          <WorkoutTab
            position={position}
            todayDay={todayDay}
            completedDows={completedDows}
            latestWeight={latestWeight}
            targetWeightKg={targetWeightKg}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: errors about missing tab components (normal — they'll be added next).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/JarvisDashboard.tsx
git commit -m "feat: add JarvisDashboard shell with tab navigation"
```

---

## Task 11: OverviewTab

**Files:**
- Create: `src/components/dashboard/tabs/OverviewTab.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/tabs/OverviewTab.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { ProgrammePosition, Goal, Expense, FocusArea, FocusCheckin, Habit, HabitCompletion, DisciplineScore } from '@/types'
import { calcOverallFocusStreak, calcHabitStreak, aggregateExpensesByMonth, lastNMonthKeys, formatPence } from '@/lib/utils/dashboard-utils'

const NEXT_TRAINING_DAY: Record<number, string> = {
  0: 'Monday', 1: 'Tuesday', 2: 'Thursday', 3: 'Thursday',
  4: 'Friday', 5: 'Monday', 6: 'Monday',
}

interface OverviewTabProps {
  position: ProgrammePosition
  today: string
  todayDay: { id: string; name: string; emphasis: string | null } | null
  completedDows: number[]
  goals: Goal[]
  expenses: Expense[]
  focusAreas: FocusArea[]
  focusCheckins: FocusCheckin[]
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  disciplineScores: DisciplineScore[]
}

export function OverviewTab({
  position, today, todayDay, completedDows,
  goals, expenses, focusAreas, focusCheckins,
  habits, habitCompletions, disciplineScores,
}: OverviewTabProps) {
  // --- Computed stats ---
  const allCheckinDates = focusCheckins.map(c => c.date)
  const focusStreak = calcOverallFocusStreak(allCheckinDates, today)

  const activeGoals = goals.filter(g => g.status === 'active')

  const thisMonth = today.slice(0, 7)
  const monthExpenses = expenses.filter(e => e.date.startsWith(thisMonth))
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount_pence, 0)

  const last7Scores = disciplineScores.slice(0, 7).map(s => s.score)
  const avgScore = last7Scores.length
    ? (last7Scores.reduce((a, b) => a + b, 0) / last7Scores.length).toFixed(1)
    : '—'

  // Mini 6-month chart data
  const monthKeys = lastNMonthKeys(6)
  const monthlyTotals = aggregateExpensesByMonth(expenses)
  const maxMonthly = Math.max(...monthKeys.map(k => monthlyTotals[k] ?? 0), 1)

  // Today's checkins
  const todayCheckinAreaIds = new Set(
    focusCheckins.filter(c => c.date === today).map(c => c.focus_area_id)
  )
  // Today's habit completions
  const todayCompletedHabitIds = new Set(
    habitCompletions.filter(c => c.date === today).map(c => c.habit_id)
  )

  const CATEGORY_COLORS: Record<string, string> = {
    food: '#f59e0b', transport: '#06b6d4', shopping: '#a855f7',
    entertainment: '#ec4899', health: '#22c55e', other: '#6b7280',
  }

  const categoryTotals = monthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_pence
    return acc
  }, {})
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Focus Streak" value={`${focusStreak}`} unit="d" color="text-green-400" borderColor="border-green-500/20" />
        <StatCard label="Goals" value={`${activeGoals.length}`} unit={`/ ${goals.length}`} color="text-indigo-400" borderColor="border-indigo-500/20" />
        <StatCard
          label={`${new Date(today).toLocaleString('en-GB', { month: 'short' })} Spend`}
          value={formatPence(monthTotal).replace('.00', '')}
          color="text-amber-400"
          borderColor="border-amber-500/20"
        />
        <StatCard label="Discipline" value={avgScore} unit="/10" color="text-pink-400" borderColor="border-pink-500/20" />
      </div>

      {/* Today + Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Today's workout */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-2">Today · Workout</div>
          {position.isTrainingDay && todayDay ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-sm font-semibold text-green-400">{todayDay.name}</span>
              </div>
              {todayDay.emphasis && (
                <p className="font-mono text-xs text-[#555] mb-3">{todayDay.emphasis}</p>
              )}
              <Link href="/workout">
                <Button size="sm" className="w-full font-mono text-[10px] tracking-widest">
                  START WORKOUT
                </Button>
              </Link>
            </>
          ) : (
            <>
              <span className="font-mono text-sm text-[#444]">Rest Day</span>
              <p className="font-mono text-xs text-[#333] mt-1">
                Next: {NEXT_TRAINING_DAY[position.dayOfWeek]}
              </p>
            </>
          )}
        </div>

        {/* Active goals top 3 */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Active Goals</div>
          {activeGoals.length === 0 ? (
            <p className="font-mono text-xs text-[#333]">No active goals</p>
          ) : (
            <div className="space-y-3">
              {activeGoals.slice(0, 3).map(goal => {
                const pct = goal.target_value
                  ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                  : 0
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-[#888] truncate pr-2">{goal.title}</span>
                      <span className="font-mono text-[10px] text-[#444] shrink-0">{pct}%</span>
                    </div>
                    <div className="h-[3px] bg-[#111] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Focus + Habits + Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Focus areas */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Focus Areas</div>
          {focusAreas.length === 0 ? (
            <p className="font-mono text-xs text-[#333]">None yet</p>
          ) : (
            <div className="space-y-2">
              {focusAreas.filter(a => a.is_active).map(area => {
                const areaCheckins = focusCheckins
                  .filter(c => c.focus_area_id === area.id)
                  .map(c => c.date)
                const streak = calcHabitStreak(areaCheckins, today)
                const checkedToday = todayCheckinAreaIds.has(area.id)
                return (
                  <div key={area.id} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#888]">{area.emoji} {area.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-cyan-400">{streak}d</span>
                      <div className={`size-4 rounded-sm flex items-center justify-center text-[8px] ${
                        checkedToday
                          ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                          : 'bg-[#111] border border-[#222] text-[#333]'
                      }`}>
                        {checkedToday ? '✓' : '○'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Habits */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Habits · Today</div>
          {habits.length === 0 ? (
            <p className="font-mono text-xs text-[#333]">None yet</p>
          ) : (
            <div className="space-y-2">
              {habits.filter(h => h.is_active).map(habit => {
                const completions = habitCompletions
                  .filter(c => c.habit_id === habit.id)
                  .map(c => c.date)
                const streak = calcHabitStreak(completions, today)
                const doneToday = todayCompletedHabitIds.has(habit.id)
                return (
                  <div key={habit.id} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#888]">{habit.emoji} {habit.name}</span>
                    <div className="flex items-center gap-2">
                      {streak > 0 && (
                        <span className="font-mono text-[9px] text-amber-400">🔥{streak}</span>
                      )}
                      <div className={`size-4 rounded-sm flex items-center justify-center text-[8px] ${
                        doneToday
                          ? 'bg-pink-500/10 border border-pink-500/30 text-pink-400'
                          : 'bg-[#111] border border-[#222] text-[#333]'
                      }`}>
                        {doneToday ? '✓' : '○'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expenses mini */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">
            Spend · {new Date(today).toLocaleString('en-GB', { month: 'short' })}
          </div>
          {/* Mini bar chart */}
          <div className="flex gap-1 items-end h-8 mb-2">
            {monthKeys.map(key => {
              const total = monthlyTotals[key] ?? 0
              const heightPct = Math.max(4, (total / maxMonthly) * 100)
              const isCurrent = key === thisMonth
              return (
                <div
                  key={key}
                  className={`flex-1 rounded-t-[2px] ${
                    isCurrent ? 'bg-amber-500/40 border border-amber-500/40' : 'bg-[#1a1a1a]'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              )
            })}
          </div>
          <div className="space-y-1">
            {topCategories.map(([cat, pence]) => (
              <div key={cat} className="flex justify-between">
                <span className="font-mono text-[9px] capitalize" style={{ color: CATEGORY_COLORS[cat] ?? '#6b7280' }}>
                  {cat}
                </span>
                <span className="font-mono text-[9px] text-amber-400">{formatPence(pence)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, unit, color, borderColor,
}: {
  label: string; value: string; unit?: string; color: string; borderColor: string
}) {
  return (
    <div className={`bg-[#0a0a0a] border rounded-md p-4 ${borderColor}`}>
      <div className="font-mono text-[8px] tracking-widest uppercase text-[#444] mb-2">{label}</div>
      <div className={`font-mono text-2xl font-bold leading-none ${color}`}>
        {value}
        {unit && <span className="text-xs font-normal text-[#333] ml-1">{unit}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/tabs/OverviewTab.tsx
git commit -m "feat: add OverviewTab with stat cards and domain summaries"
```

---

## Task 12: ExpensesTab

**Files:**
- Create: `src/components/dashboard/tabs/ExpensesTab.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/tabs/ExpensesTab.tsx`:

```typescript
'use client'

import { useTransition } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Button } from '@/components/ui/button'
import type { Expense } from '@/types'
import { addExpense, deleteExpense } from '@/actions/expenses'
import { aggregateExpensesByMonth, lastNMonthKeys, formatPence } from '@/lib/utils/dashboard-utils'

const CATEGORIES = ['food', 'transport', 'shopping', 'entertainment', 'health', 'other'] as const
const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b', transport: '#06b6d4', shopping: '#a855f7',
  entertainment: '#ec4899', health: '#22c55e', other: '#6b7280',
}

interface ExpensesTabProps {
  expenses: Expense[]
  today: string
}

export function ExpensesTab({ expenses, today }: ExpensesTabProps) {
  const [isPending, startTransition] = useTransition()

  const thisMonth = today.slice(0, 7)
  const prevMonth = new Date(today)
  prevMonth.setMonth(prevMonth.getMonth() - 1)
  const prevMonthKey = prevMonth.toISOString().slice(0, 7)

  const monthlyTotals = aggregateExpensesByMonth(expenses)
  const thisMonthTotal = monthlyTotals[thisMonth] ?? 0
  const prevMonthTotal = monthlyTotals[prevMonthKey] ?? 0
  const delta = thisMonthTotal - prevMonthTotal

  const monthKeys = lastNMonthKeys(6)
  const chartData = monthKeys.map(key => ({
    month: new Date(key + '-01').toLocaleString('en-GB', { month: 'short' }),
    total: (monthlyTotals[key] ?? 0) / 100,
    isCurrent: key === thisMonth,
  }))

  const thisMonthExpenses = expenses
    .filter(e => e.date.startsWith(thisMonth))
    .sort((a, b) => b.date.localeCompare(a.date))

  const categoryTotals = thisMonthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_pence
    return acc
  }, {})

  function handleAdd(formData: FormData) {
    startTransition(() => { addExpense(formData) })
  }

  function handleDelete(id: string) {
    startTransition(() => { deleteExpense(id) })
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Month headline */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-1">
          {new Date(today).toLocaleString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()}
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-3xl font-bold text-amber-400">{formatPence(thisMonthTotal)}</span>
          {prevMonthTotal > 0 && (
            <span className={`font-mono text-xs ${delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {delta > 0 ? '↑' : '↓'} {formatPence(Math.abs(delta))} vs last month
            </span>
          )}
        </div>
      </div>

      {/* 6-month chart */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">6-Month Trend</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} barCategoryGap="30%">
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fontFamily: 'var(--font-geist-mono)', fill: '#444' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: '#ffffff08' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-[#111] border border-[#222] rounded px-2 py-1 font-mono text-[10px] text-amber-400">
                    £{payload[0].value?.toString()}
                  </div>
                )
              }}
            />
            <Bar dataKey="total" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isCurrent ? '#f59e0b' : '#1a1a1a'}
                  stroke={entry.isCurrent ? '#f59e0b66' : '#222'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">By Category</div>
          <div className="space-y-2">
            {Object.entries(categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, pence]) => {
                const pct = thisMonthTotal > 0 ? (pence / thisMonthTotal) * 100 : 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] capitalize" style={{ color: CATEGORY_COLORS[cat] }}>
                        {cat}
                      </span>
                      <span className="font-mono text-[10px] text-[#444]">{formatPence(pence)}</span>
                    </div>
                    <div className="h-[3px] bg-[#111] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Add expense form */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Add Expense</div>
        <form action={handleAdd} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
            className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-amber-500/50"
          />
          <select
            name="category"
            required
            className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] focus:outline-none focus:border-amber-500/50"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            name="description"
            type="text"
            placeholder="Description"
            className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-amber-500/50"
          />
          <input
            name="date"
            type="date"
            defaultValue={today}
            required
            className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] focus:outline-none focus:border-amber-500/50"
          />
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            variant="outline"
            className="col-span-2 md:col-span-4 font-mono text-[10px] tracking-widest border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            {isPending ? 'ADDING...' : '+ ADD EXPENSE'}
          </Button>
        </form>
      </div>

      {/* Recent transactions */}
      {thisMonthExpenses.length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Transactions</div>
          <div className="space-y-0">
            {thisMonthExpenses.map(expense => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-[#111] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] text-[#333]">
                    {new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="font-mono text-[10px] text-[#666] capitalize">{expense.category}</span>
                  {expense.description && (
                    <span className="font-mono text-[10px] text-[#444] truncate max-w-32">{expense.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-amber-400">{formatPence(expense.amount_pence)}</span>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    disabled={isPending}
                    className="font-mono text-[9px] text-[#333] hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/tabs/ExpensesTab.tsx
git commit -m "feat: add ExpensesTab with recharts bar chart and transaction management"
```

---

## Task 13: GoalsTab

**Files:**
- Create: `src/components/dashboard/tabs/GoalsTab.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/tabs/GoalsTab.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Goal } from '@/types'
import { addGoal, updateGoalProgress, completeGoal } from '@/actions/goals'

interface GoalsTabProps {
  goals: Goal[]
  today: string
}

export function GoalsTab({ goals, today }: GoalsTabProps) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  function handleAddGoal(formData: FormData) {
    startTransition(() => { addGoal(formData) })
  }

  function handleUpdateProgress(id: string) {
    const value = parseFloat(editValue)
    if (isNaN(value)) return
    startTransition(() => {
      updateGoalProgress(id, value)
      setEditingId(null)
    })
  }

  function handleComplete(id: string) {
    startTransition(() => { completeGoal(id) })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Active goals */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-4">
          Active Goals · {activeGoals.length}
        </div>
        {activeGoals.length === 0 ? (
          <p className="font-mono text-xs text-[#333]">No active goals. Add one below.</p>
        ) : (
          <div className="space-y-4">
            {activeGoals.map(goal => {
              const pct = goal.target_value
                ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                : 0
              const daysLeft = goal.deadline
                ? Math.ceil((new Date(goal.deadline).getTime() - new Date(today).getTime()) / 86400000)
                : null

              return (
                <div key={goal.id} className="border border-[#1a1a1a] rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-sm font-semibold text-indigo-400">{goal.title}</p>
                      {goal.description && (
                        <p className="font-mono text-[10px] text-[#444] mt-0.5">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {daysLeft !== null && (
                        <Badge
                          variant="outline"
                          className={`font-mono text-[9px] ${
                            daysLeft < 7
                              ? 'text-red-400 border-red-500/30'
                              : 'text-[#444] border-[#222]'
                          }`}
                        >
                          {daysLeft}d left
                        </Badge>
                      )}
                      <button
                        onClick={() => handleComplete(goal.id)}
                        disabled={isPending}
                        className="font-mono text-[9px] text-[#333] hover:text-green-400 transition-colors"
                      >
                        ✓ done
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-[3px] bg-[#111] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-[#444] shrink-0">{pct}%</span>
                  </div>

                  {/* Current / Target + edit */}
                  <div className="flex items-center gap-2">
                    {editingId === goal.id ? (
                      <>
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-20 bg-[#111] border border-indigo-500/30 rounded px-2 py-1 font-mono text-xs text-indigo-400 focus:outline-none"
                          autoFocus
                        />
                        <span className="font-mono text-[9px] text-[#333]">
                          / {goal.target_value} {goal.unit}
                        </span>
                        <button
                          onClick={() => handleUpdateProgress(goal.id)}
                          className="font-mono text-[9px] text-indigo-400 hover:text-indigo-300"
                        >
                          save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="font-mono text-[9px] text-[#444] hover:text-[#888]"
                        >
                          cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-xs text-[#666]">
                          {goal.current_value} / {goal.target_value ?? '?'} {goal.unit}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(goal.id)
                            setEditValue(String(goal.current_value))
                          }}
                          className="font-mono text-[9px] text-[#333] hover:text-indigo-400 transition-colors"
                        >
                          update
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add goal form */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Add Goal</div>
        <form action={handleAddGoal} className="space-y-2">
          <input
            name="title"
            type="text"
            placeholder="Goal title"
            required
            className="w-full bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-indigo-500/50"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              name="target_value"
              type="number"
              step="any"
              placeholder="Target"
              className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-indigo-500/50"
            />
            <input
              name="unit"
              type="text"
              placeholder="Unit (kg, books…)"
              className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-indigo-500/50"
            />
            <input
              name="deadline"
              type="date"
              className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            variant="outline"
            className="w-full font-mono text-[10px] tracking-widest border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
          >
            {isPending ? 'ADDING...' : '+ ADD GOAL'}
          </Button>
        </form>
      </div>

      {/* Completed */}
      {completedGoals.length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">
            Completed · {completedGoals.length}
          </div>
          <div className="space-y-1">
            {completedGoals.map(goal => (
              <div key={goal.id} className="flex items-center gap-2 py-1">
                <span className="font-mono text-[9px] text-green-400">✓</span>
                <span className="font-mono text-[10px] text-[#444] line-through">{goal.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/tabs/GoalsTab.tsx
git commit -m "feat: add GoalsTab with progress tracking and inline editing"
```

---

## Task 14: FocusTab

**Files:**
- Create: `src/components/dashboard/tabs/FocusTab.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/tabs/FocusTab.tsx`:

```typescript
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { FocusArea, FocusCheckin } from '@/types'
import { addFocusArea, toggleCheckin } from '@/actions/focus'
import { calcStreak } from '@/lib/utils/dashboard-utils'

interface FocusTabProps {
  focusAreas: FocusArea[]
  focusCheckins: FocusCheckin[]
  today: string
}

function last30DayKeys(today: string): string[] {
  const keys: string[] = []
  const d = new Date(today)
  for (let i = 29; i >= 0; i--) {
    const day = new Date(d)
    day.setDate(d.getDate() - i)
    keys.push(day.toISOString().split('T')[0])
  }
  return keys
}

export function FocusTab({ focusAreas, focusCheckins, today }: FocusTabProps) {
  const [isPending, startTransition] = useTransition()
  const days = last30DayKeys(today)

  function handleToggle(focusAreaId: string) {
    startTransition(() => { toggleCheckin(focusAreaId, today) })
  }

  function handleAdd(formData: FormData) {
    startTransition(() => { addFocusArea(formData) })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Focus areas */}
      {focusAreas.filter(a => a.is_active).length === 0 ? (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <p className="font-mono text-xs text-[#333]">No focus areas yet. Add one below.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {focusAreas.filter(a => a.is_active).map(area => {
            const areaCheckins = focusCheckins
              .filter(c => c.focus_area_id === area.id)
              .map(c => c.date)
            const checkinSet = new Set(areaCheckins)
            const streak = calcStreak(areaCheckins, today)
            const checkedToday = checkinSet.has(today)

            return (
              <div key={area.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{area.emoji}</span>
                    <span className="font-mono text-sm font-semibold text-[#ccc]">{area.name}</span>
                    {streak > 0 && (
                      <span className="font-mono text-xs text-cyan-400">{streak}d streak</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(area.id)}
                    disabled={isPending}
                    className={`font-mono text-[10px] tracking-widest px-3 py-1 rounded border transition-all ${
                      checkedToday
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                        : 'bg-[#111] border-[#222] text-[#444] hover:border-cyan-500/30 hover:text-cyan-400'
                    }`}
                  >
                    {checkedToday ? '✓ DONE' : '○ CHECK IN'}
                  </button>
                </div>

                {/* 30-day dot grid */}
                <div className="flex gap-[3px] flex-wrap">
                  {days.map(day => {
                    const done = checkinSet.has(day)
                    const isToday = day === today
                    return (
                      <div
                        key={day}
                        title={day}
                        className={`w-[10px] h-[10px] rounded-[2px] ${
                          done
                            ? 'bg-cyan-500/50 border border-cyan-500/40'
                            : isToday
                              ? 'bg-[#111] border border-cyan-500/20'
                              : 'bg-[#111] border border-[#1a1a1a]'
                        }`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[8px] text-[#333]">30 days ago</span>
                  <span className="font-mono text-[8px] text-[#333]">today</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add focus area */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Add Focus Area</div>
        <form action={handleAdd} className="flex gap-2">
          <input
            name="emoji"
            type="text"
            placeholder="🎯"
            maxLength={2}
            className="w-12 bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-sm text-center text-[#aaa] focus:outline-none focus:border-cyan-500/50"
          />
          <input
            name="name"
            type="text"
            placeholder="Focus area name"
            required
            className="flex-1 bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-cyan-500/50"
          />
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            variant="outline"
            className="font-mono text-[10px] tracking-widest border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 shrink-0"
          >
            + ADD
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/tabs/FocusTab.tsx
git commit -m "feat: add FocusTab with 30-day dot grid and check-in toggle"
```

---

## Task 15: DisciplineTab

**Files:**
- Create: `src/components/dashboard/tabs/DisciplineTab.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/tabs/DisciplineTab.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Button } from '@/components/ui/button'
import type { Habit, HabitCompletion, DisciplineScore } from '@/types'
import { addHabit, toggleHabitCompletion, saveDisciplineScore } from '@/actions/discipline'
import { calcHabitStreak } from '@/lib/utils/dashboard-utils'

interface DisciplineTabProps {
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  disciplineScores: DisciplineScore[]
  today: string
}

function last7DayKeys(today: string): string[] {
  const keys: string[] = []
  const d = new Date(today)
  for (let i = 6; i >= 0; i--) {
    const day = new Date(d)
    day.setDate(d.getDate() - i)
    keys.push(day.toISOString().split('T')[0])
  }
  return keys
}

function last30DayKeys(today: string): string[] {
  const keys: string[] = []
  const d = new Date(today)
  for (let i = 29; i >= 0; i--) {
    const day = new Date(d)
    day.setDate(d.getDate() - i)
    keys.push(day.toISOString().split('T')[0])
  }
  return keys
}

export function DisciplineTab({ habits, habitCompletions, disciplineScores, today }: DisciplineTabProps) {
  const [isPending, startTransition] = useTransition()
  const [scoreInput, setScoreInput] = useState<number>(
    disciplineScores.find(s => s.date === today)?.score ?? 7
  )

  const last7Days = last7DayKeys(today)
  const last30Days = last30DayKeys(today)

  const todayCompletedHabitIds = new Set(
    habitCompletions.filter(c => c.date === today).map(c => c.habit_id)
  )
  const todayScore = disciplineScores.find(s => s.date === today)

  const scoreMap = new Map(disciplineScores.map(s => [s.date, s.score]))
  const chartData = last30Days.map(day => ({
    day: new Date(day).getDate().toString(),
    score: scoreMap.get(day) ?? null,
  }))

  function handleToggleHabit(habitId: string) {
    startTransition(() => { toggleHabitCompletion(habitId, today) })
  }

  function handleSaveScore() {
    startTransition(() => { saveDisciplineScore(today, scoreInput) })
  }

  function handleAddHabit(formData: FormData) {
    startTransition(() => { addHabit(formData) })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Habits checklist */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Today's Habits</div>
        {habits.filter(h => h.is_active).length === 0 ? (
          <p className="font-mono text-xs text-[#333]">No habits yet.</p>
        ) : (
          <div className="space-y-0">
            {habits.filter(h => h.is_active).map(habit => {
              const completions = habitCompletions
                .filter(c => c.habit_id === habit.id)
                .map(c => c.date)
              const streak = calcHabitStreak(completions, today)
              const doneToday = todayCompletedHabitIds.has(habit.id)
              const completionSet = new Set(completions)

              return (
                <div key={habit.id} className="py-2.5 border-b border-[#0d0d0d] last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleHabit(habit.id)}
                        disabled={isPending}
                        className={`size-5 rounded border flex items-center justify-center text-[10px] transition-all ${
                          doneToday
                            ? 'bg-pink-500/10 border-pink-500/40 text-pink-400'
                            : 'bg-[#111] border-[#222] text-[#333] hover:border-pink-500/30'
                        }`}
                      >
                        {doneToday ? '✓' : ''}
                      </button>
                      <span className="font-mono text-xs text-[#888]">{habit.emoji} {habit.name}</span>
                    </div>
                    {streak > 0 && (
                      <span className="font-mono text-[10px] text-amber-400">🔥 {streak}d</span>
                    )}
                  </div>
                  {/* 7-day dot grid */}
                  <div className="flex gap-[3px] ml-7">
                    {last7Days.map(day => {
                      const done = completionSet.has(day)
                      const isToday = day === today
                      const label = new Date(day).toLocaleString('en-GB', { weekday: 'narrow' })
                      return (
                        <div key={day} className="flex flex-col items-center gap-0.5">
                          <div className={`w-5 h-5 rounded-[3px] flex items-center justify-center text-[7px] ${
                            done
                              ? 'bg-pink-500/20 border border-pink-500/40 text-pink-400'
                              : isToday
                                ? 'bg-[#111] border border-pink-500/20 text-[#333]'
                                : 'bg-[#0d0d0d] border border-[#111] text-[#222]'
                          }`}>
                            {done ? '✓' : ''}
                          </div>
                          <span className={`font-mono text-[7px] ${isToday ? 'text-pink-400' : 'text-[#333]'}`}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Daily score */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444]">Today's Score</div>
          {todayScore && (
            <span className="font-mono text-xs text-pink-400">{todayScore.score}/10 saved</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={10}
            value={scoreInput}
            onChange={e => setScoreInput(Number(e.target.value))}
            className="flex-1 accent-pink-500"
          />
          <span className="font-mono text-2xl font-bold text-pink-400 w-8">{scoreInput}</span>
          <Button
            onClick={handleSaveScore}
            disabled={isPending}
            size="sm"
            variant="outline"
            className="font-mono text-[10px] tracking-widest border-pink-500/30 text-pink-400 hover:bg-pink-500/10 shrink-0"
          >
            {isPending ? '...' : 'SAVE'}
          </Button>
        </div>
      </div>

      {/* 30-day score trend */}
      {disciplineScores.length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">30-Day Score Trend</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 8, fontFamily: 'var(--font-geist-mono)', fill: '#333' }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis domain={[0, 10]} hide />
              <Tooltip
                cursor={{ stroke: '#333' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || payload[0].value == null) return null
                  return (
                    <div className="bg-[#111] border border-[#222] rounded px-2 py-1 font-mono text-[10px] text-pink-400">
                      {payload[0].value}/10
                    </div>
                  )
                }}
              />
              <ReferenceLine y={7} stroke="#333" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#ec4899"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add habit */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Add Habit</div>
        <form action={handleAddHabit} className="flex gap-2">
          <input
            name="emoji"
            type="text"
            placeholder="✅"
            maxLength={2}
            className="w-12 bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-sm text-center text-[#aaa] focus:outline-none focus:border-pink-500/50"
          />
          <input
            name="name"
            type="text"
            placeholder="Habit name"
            required
            className="flex-1 bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-pink-500/50"
          />
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            variant="outline"
            className="font-mono text-[10px] tracking-widest border-pink-500/30 text-pink-400 hover:bg-pink-500/10 shrink-0"
          >
            + ADD
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/tabs/DisciplineTab.tsx
git commit -m "feat: add DisciplineTab with habit grid, score entry, and recharts trend"
```

---

## Task 16: Rewrite page.tsx

**Files:**
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Rewrite the page**

Replace the entire contents of `src/app/(app)/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgrammePosition } from '@/lib/utils/week-calculator'
import { redirect } from 'next/navigation'
import { JarvisDashboard } from '@/components/dashboard/JarvisDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('programme_start_date, display_name, target_weight_kg')
    .eq('id', user.id)
    .single()

  const startDate = profile?.programme_start_date
    ? new Date(profile.programme_start_date)
    : new Date()
  const position = getCurrentProgrammePosition(startDate)

  const today = new Date().toISOString().split('T')[0]
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  // Past 6 months start date for expenses
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

  // Past 30 days for checkins/completions/scores
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  // Phase 2: All independent queries in parallel
  const [
    blocksResult,
    weekSessionsResult,
    latestWeightResult,
    goalsResult,
    expensesResult,
    focusAreasResult,
    focusCheckinsResult,
    habitsResult,
    habitCompletionsResult,
    disciplineScoresResult,
  ] = await Promise.all([
    supabase
      .from('blocks')
      .select('id')
      .lte('week_start', position.weekNumber)
      .gte('week_end', position.weekNumber)
      .single(),
    supabase
      .from('workout_sessions')
      .select('session_date')
      .eq('user_id', user.id)
      .eq('week_number', position.weekNumber)
      .gte('session_date', weekStartStr),
    supabase
      .from('body_metrics')
      .select('weight_kg, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('goals')
      .select('id, title, description, target_value, current_value, unit, deadline, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('id, amount_pence, currency, category, description, date, created_at')
      .eq('user_id', user.id)
      .gte('date', sixMonthsAgoStr)
      .order('date', { ascending: false }),
    supabase
      .from('focus_areas')
      .select('id, name, emoji, sort_order, is_active')
      .eq('user_id', user.id)
      .order('sort_order'),
    supabase
      .from('focus_checkins')
      .select('id, focus_area_id, date')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgoStr),
    supabase
      .from('habits')
      .select('id, name, emoji, sort_order, is_active')
      .eq('user_id', user.id)
      .order('sort_order'),
    supabase
      .from('habit_completions')
      .select('id, habit_id, date')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgoStr),
    supabase
      .from('discipline_scores')
      .select('id, date, score, notes')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: false }),
  ])

  // Phase 3: todayDay depends on blocks
  const { data: todayDay } = blocksResult.data
    ? await supabase
        .from('programme_days')
        .select('id, name, emphasis')
        .eq('block_id', blocksResult.data.id)
        .eq('day_of_week', position.dayOfWeek)
        .single()
    : { data: null }

  const completedDows = (weekSessionsResult.data ?? []).map(
    s => new Date(s.session_date).getDay()
  )

  return (
    <JarvisDashboard
      displayName={profile?.display_name ?? null}
      position={position}
      todayDay={todayDay ?? null}
      completedDows={completedDows}
      latestWeight={latestWeightResult.data ?? null}
      targetWeightKg={profile?.target_weight_kg ?? null}
      goals={goalsResult.data ?? []}
      expenses={expensesResult.data ?? []}
      focusAreas={focusAreasResult.data ?? []}
      focusCheckins={focusCheckinsResult.data ?? []}
      habits={habitsResult.data ?? []}
      habitCompletions={habitCompletionsResult.data ?? []}
      disciplineScores={disciplineScoresResult.data ?? []}
      today={today}
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Open http://localhost:3000 — dashboard should load with Command Centre aesthetic.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/page.tsx
git commit -m "feat: rewrite dashboard page with parallel data fetching and JarvisDashboard"
```

---

## Task 17: Update App Layout

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Apply Nothing design fonts and layout**

Replace the contents of `src/app/(app)/layout.tsx`:

```typescript
import { Doto, Space_Grotesk, Space_Mono } from 'next/font/google'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { cn } from '@/lib/utils'

const doto = Doto({ subsets: ['latin'], variable: '--font-doto' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', weight: ['400', '700'] })

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "min-h-screen bg-black text-[#E8E8E8] antialiased selection:bg-red-500/30",
      doto.variable,
      spaceGrotesk.variable,
      spaceMono.variable
    )}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset suppressHydrationWarning className="bg-black">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "feat: apply nothing design fonts and base layout"
```

---

## Verification Checklist

Run through these after all tasks complete:

- [ ] 7 new tables exist in Supabase: `expenses`, `goals`, `focus_areas`, `focus_checkins`, `habits`, `habit_completions`, `discipline_scores`
- [ ] `/` loads with JARVIS header, monospace font, dark `#050505` background
- [ ] Tab switching between all 6 tabs is instant (no loading spinner)
- [ ] Add expense → appears in Expenses tab, Overview spend card shows correct total on page refresh
- [ ] Delete expense → removed from list
- [ ] Add goal → appears in Goals tab with 0% progress bar
- [ ] Update goal progress → bar moves, percentage updates
- [ ] Mark goal complete → moves to Completed section
- [ ] Add focus area → appears in Focus tab
- [ ] Toggle check-in → dot grid updates, streak increments
- [ ] Add habit → appears in Discipline tab
- [ ] Check habit → completion dot appears, streak starts
- [ ] Enter discipline score + save → appears in 30-day trend chart
- [ ] Workout tab shows same data as old `/` home page
- [ ] `/programme` still works unchanged
- [ ] Run `npx vitest run` — all 8 dashboard-utils tests pass
