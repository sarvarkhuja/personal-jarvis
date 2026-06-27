-- supabase/migrations/007_events.sql
-- Run in Supabase Dashboard → SQL Editor.
-- Future plans / appointments per SPEC §events.

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  kind TEXT NOT NULL DEFAULT 'event'
    CHECK (kind IN ('event', 'appointment', 'milestone')),
  linked_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user_starts
  ON public.events (user_id, starts_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_own" ON public.events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "events_insert_own" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "events_update_own" ON public.events
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "events_delete_own" ON public.events
  FOR DELETE USING (auth.uid() = user_id);
