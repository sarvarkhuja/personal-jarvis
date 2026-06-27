-- supabase/migrations/014_goals_drop_progress_columns.sql
-- Run in Supabase Dashboard → SQL Editor.
-- Removes the progress_target / progress_unit pair from goals. The legacy
-- target_value / unit columns (from migration 002) remain as the single
-- source of truth for goal targets.
--
-- Drops the goal_progress view first, since it references the columns.

DROP VIEW IF EXISTS public.goal_progress;

ALTER TABLE public.goals
  DROP COLUMN IF EXISTS progress_target,
  DROP COLUMN IF EXISTS progress_unit;
