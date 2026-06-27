-- supabase/migrations/015_drop_sync_goal_habit_count.sql
-- Run in Supabase Dashboard → SQL Editor.
--
-- Removes the orphaned trigger left over from the pre-014 design.
-- `sync_goal_habit_count()` ran on every habits INSERT/UPDATE/DELETE and did:
--     UPDATE public.goals SET progress_target = (count of habits), progress_unit = 'habits'
-- but migration 014 dropped goals.progress_target / progress_unit. The trigger
-- was never removed, so it threw
--     42703: column "progress_target" of relation "goals" does not exist
-- on every habit create / delete / goal-reassignment.
--
-- Nothing reads this denormalized count anymore (the app derives habits-per-goal
-- with a plain COUNT on read), so the trigger + function are dropped outright.
-- Idempotent: safe to re-run.

DROP TRIGGER IF EXISTS trg_sync_goal_habit_count ON public.habits;
DROP FUNCTION IF EXISTS public.sync_goal_habit_count();
