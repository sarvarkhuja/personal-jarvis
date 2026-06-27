-- supabase/migrations/005_habit_logs.sql
-- Run in Supabase Dashboard → SQL Editor.
-- New habit_logs table per SPEC §habit_logs. Distinct from the existing
-- habit_completions table (which the dashboard still reads); habit_logs is
-- the SPEC-aligned table the new /habits and /today routes write to.

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
  ON public.habit_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date
  ON public.habit_logs (habit_id, log_date DESC);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_logs_select_own" ON public.habit_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habit_logs_insert_own" ON public.habit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_logs_update_own" ON public.habit_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_logs_delete_own" ON public.habit_logs
  FOR DELETE USING (auth.uid() = user_id);
