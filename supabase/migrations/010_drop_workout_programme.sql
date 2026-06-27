-- Drop the workout/programme tables.
-- Removes blocks, programme_days, programme_exercises, workout_sessions, workout_sets
-- and the personal_records.session_id FK column that pointed at workout_sessions.

ALTER TABLE public.personal_records DROP COLUMN IF EXISTS session_id;

DROP INDEX IF EXISTS public.idx_sets_session;
DROP INDEX IF EXISTS public.idx_sets_exercise;
DROP INDEX IF EXISTS public.idx_sessions_user_date;
DROP INDEX IF EXISTS public.idx_sessions_week;

DROP POLICY IF EXISTS "Users access own sets" ON public.workout_sets;
DROP POLICY IF EXISTS "Users access own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Authenticated users read exercises" ON public.programme_exercises;
DROP POLICY IF EXISTS "Authenticated users read days" ON public.programme_days;
DROP POLICY IF EXISTS "Authenticated users read blocks" ON public.blocks;

DROP TABLE IF EXISTS public.workout_sets;
DROP TABLE IF EXISTS public.workout_sessions;
DROP TABLE IF EXISTS public.programme_exercises;
DROP TABLE IF EXISTS public.programme_days;
DROP TABLE IF EXISTS public.blocks;
