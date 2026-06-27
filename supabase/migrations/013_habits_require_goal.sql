-- supabase/migrations/013_habits_require_goal.sql
-- Run in Supabase Dashboard → SQL Editor.
-- Makes every habit own a goal: adds habits.goal_id NOT NULL with FK to goals.
-- Backfill order:
--   1) For habits already pointed to by some goal.linked_habit_id (same user),
--      adopt that goal as the habit's goal_id (earliest goal wins on ties).
--   2) For each user that still has orphan habits, create one 'General' goal
--      and assign their remaining orphan habits to it.
-- Then SET NOT NULL and add a (user_id, goal_id) index.

-- ============================================
-- 1. Add column (nullable for backfill)
-- ============================================
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS goal_id UUID
  REFERENCES public.goals(id) ON DELETE CASCADE;

-- ============================================
-- 2a. Backfill from goals.linked_habit_id reverse mapping
-- ============================================
WITH ranked_links AS (
  SELECT
    g.linked_habit_id AS habit_id,
    g.id              AS goal_id,
    ROW_NUMBER() OVER (
      PARTITION BY g.linked_habit_id
      ORDER BY g.created_at ASC, g.id ASC
    ) AS rn
  FROM public.goals g
  JOIN public.habits h
    ON h.id = g.linked_habit_id
   AND h.user_id = g.user_id
  WHERE g.linked_habit_id IS NOT NULL
)
UPDATE public.habits h
   SET goal_id = rl.goal_id
  FROM ranked_links rl
 WHERE rl.habit_id = h.id
   AND rl.rn = 1
   AND h.goal_id IS NULL;

-- ============================================
-- 2b. Create one 'General' goal per user with orphan habits, then assign
-- ============================================
WITH orphans AS (
  SELECT DISTINCT user_id
    FROM public.habits
   WHERE goal_id IS NULL
),
new_goals AS (
  INSERT INTO public.goals (user_id, title, status)
  SELECT user_id, 'General', 'active'
    FROM orphans
  RETURNING id, user_id
)
UPDATE public.habits h
   SET goal_id = ng.id
  FROM new_goals ng
 WHERE ng.user_id = h.user_id
   AND h.goal_id IS NULL;

-- ============================================
-- 3. Enforce NOT NULL
-- ============================================
ALTER TABLE public.habits
  ALTER COLUMN goal_id SET NOT NULL;

-- ============================================
-- 4. Index for "habits for a goal" lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_habits_user_goal
  ON public.habits (user_id, goal_id);
