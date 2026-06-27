-- ============================================
-- HABITS — optional wall-clock time for timer habits.
-- Nullable; existing rows default to NULL ("Anytime"). TIME is zoneless,
-- so bucketing into parts of day is pure string math at read time.
-- ============================================
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;
