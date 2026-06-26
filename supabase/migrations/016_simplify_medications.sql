-- 016_simplify_medications.sql
-- Reduce "pills" (medications) to a habit-style daily checkbox: name + per-day toggle.
-- Drops dosage/schedule/supply/notes; collapses medication_logs to one row per day.

-- 1. medications: drop everything except name.
ALTER TABLE public.medications
  DROP COLUMN IF EXISTS dosage,
  DROP COLUMN IF EXISTS schedule_json,
  DROP COLUMN IF EXISTS supply_count,
  DROP COLUMN IF EXISTS supply_warn_days,
  DROP COLUMN IF EXISTS notes;

-- 2. medication_logs: collapse to one row per (user, medication, day).
--    Dedupe BEFORE adding the unique index (the table currently allows
--    multiple dose rows per day). Keep the earliest row per group.
DELETE FROM public.medication_logs
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY user_id, medication_id, log_date
      ORDER BY created_at, id
    ) AS rn
    FROM public.medication_logs
  ) ranked
  WHERE ranked.rn > 1
);

ALTER TABLE public.medication_logs
  DROP COLUMN IF EXISTS taken_at,
  DROP COLUMN IF EXISTS scheduled_time,
  DROP COLUMN IF EXISTS skipped,
  DROP COLUMN IF EXISTS note;

CREATE UNIQUE INDEX IF NOT EXISTS medication_logs_user_med_date_key
  ON public.medication_logs (user_id, medication_id, log_date);

-- 3. Atomic per-day toggle — mirror of toggle_habit_completion (003).
CREATE OR REPLACE FUNCTION toggle_medication_completion(
  p_user_id UUID, p_medication_id UUID, p_date DATE
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.medication_logs
  WHERE user_id = p_user_id AND medication_id = p_medication_id AND log_date = p_date;
  IF NOT FOUND THEN
    INSERT INTO public.medication_logs (user_id, medication_id, log_date)
    VALUES (p_user_id, p_medication_id, p_date);
  END IF;
END; $$;
