-- supabase/migrations/008_focus_sessions.sql
-- Run in Supabase Dashboard → SQL Editor.
-- New focus_sessions table per SPEC §focus_sessions.
-- Distinct from the existing focus_areas/focus_checkins tables, which the
-- legacy dashboard's Focus tab still uses.

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  planned_minutes INT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  intent TEXT,
  linked_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  linked_habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started
  ON public.focus_sessions (user_id, started_at DESC);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "focus_sessions_select_own" ON public.focus_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "focus_sessions_insert_own" ON public.focus_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "focus_sessions_update_own" ON public.focus_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "focus_sessions_delete_own" ON public.focus_sessions
  FOR DELETE USING (auth.uid() = user_id);
