-- ============================================
-- HABITS — remove the emoji concept. All live readers/writers were removed
-- in the same change set. The legacy (unrouted) JarvisDashboard subsystem is
-- dead code and does not run, so dropping the column is safe.
-- ============================================
ALTER TABLE public.habits
  DROP COLUMN IF EXISTS emoji;
