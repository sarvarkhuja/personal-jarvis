-- supabase/migrations/004_tracker_extend.sql
-- Run in Supabase Dashboard → SQL Editor.
-- Extends profiles, habits, and goals to match docs/superpowers/plans/SPEC.md.

-- ============================================
-- PROFILES — add timezone + theme
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system'));

-- ============================================
-- HABITS — extend to support kind/target/unit/frequency/color/archived
-- Existing rows keep emoji/sort_order/is_active; new columns default to a
-- daily 'check' habit so legacy rows remain valid without backfill.
-- ============================================
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'check'
    CHECK (kind IN ('check', 'counter', 'timer')),
  ADD COLUMN IF NOT EXISTS target NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS frequency_json JSONB NOT NULL DEFAULT '{"type":"daily"}'::jsonb,
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'gray',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================
-- GOALS — add target_date, parent, linked_habit, progress fields,
-- and broaden the status check to keep legacy rows valid while
-- allowing SPEC-style 'done'/'abandoned'.
-- ============================================
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS target_date DATE,
  ADD COLUMN IF NOT EXISTS parent_goal_id UUID
    REFERENCES public.goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_habit_id UUID
    REFERENCES public.habits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS progress_target NUMERIC,
  ADD COLUMN IF NOT EXISTS progress_unit TEXT;

-- Drop the old narrow status CHECK if present, then add a broader one.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.goals'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.goals DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_status_check
  CHECK (status IN ('active', 'done', 'abandoned', 'completed', 'paused'));
