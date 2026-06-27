-- supabase/migrations/006_medications.sql
-- Run in Supabase Dashboard → SQL Editor.
-- New medications + medication_logs tables per SPEC §medications/medication_logs.

-- ============================================
-- MEDICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  schedule_json JSONB NOT NULL,
  supply_count NUMERIC,
  supply_warn_days INT NOT NULL DEFAULT 7,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_user_active
  ON public.medications (user_id) WHERE archived_at IS NULL;

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medications_select_own" ON public.medications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "medications_insert_own" ON public.medications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medications_update_own" ON public.medications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medications_delete_own" ON public.medications
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- MEDICATION_LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_date DATE NOT NULL,
  scheduled_time TIME,
  skipped BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_logs_user_date
  ON public.medication_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_medication_logs_med_date
  ON public.medication_logs (medication_id, log_date DESC);

ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medication_logs_select_own" ON public.medication_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "medication_logs_insert_own" ON public.medication_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medication_logs_update_own" ON public.medication_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medication_logs_delete_own" ON public.medication_logs
  FOR DELETE USING (auth.uid() = user_id);
