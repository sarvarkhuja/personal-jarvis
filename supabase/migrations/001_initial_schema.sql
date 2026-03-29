-- supabase/migrations/001_initial_schema.sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  height_cm NUMERIC(5,1),
  target_weight_kg NUMERIC(5,1),
  programme_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  unit_preference TEXT DEFAULT 'kg' CHECK (unit_preference IN ('kg', 'lbs')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PROGRAMME STRUCTURE
-- ============================================
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  week_start INT NOT NULL,
  week_end INT NOT NULL,
  focus TEXT,
  rep_range_compounds TEXT,
  rep_range_accessories TEXT,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.programme_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,
  name TEXT NOT NULL,
  emphasis TEXT,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.programme_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_day_id UUID REFERENCES public.programme_days(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INT NOT NULL,
  reps_min INT NOT NULL,
  reps_max INT NOT NULL,
  tempo TEXT,
  rest_seconds INT NOT NULL,
  rest_category TEXT CHECK (rest_category IN ('short', 'moderate', 'long')),
  coach_note TEXT,
  muscle_groups TEXT[] DEFAULT '{}',
  is_timed BOOLEAN DEFAULT FALSE,
  time_seconds INT,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- WORKOUT LOGGING
-- ============================================
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  programme_day_id UUID REFERENCES public.programme_days(id),
  block_id UUID REFERENCES public.blocks(id),
  week_number INT NOT NULL,
  session_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_minutes INT,
  is_deload BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  programme_exercise_id UUID REFERENCES public.programme_exercises(id),
  exercise_name TEXT NOT NULL,
  set_number INT NOT NULL,
  weight_kg NUMERIC(6,2),
  reps_completed INT,
  rir INT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'skipped', 'warmup')),
  is_pr BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- BODY METRICS
-- ============================================
CREATE TABLE public.body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,2),
  waist_cm NUMERIC(5,1),
  arm_cm NUMERIC(5,1),
  leg_cm NUMERIC(5,1),
  forearm_cm NUMERIC(5,1),
  calf_cm NUMERIC(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ============================================
-- PROGRESS PHOTOS
-- ============================================
CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pose TEXT CHECK (pose IN ('front_relaxed', 'front_flexed', 'side', 'back_relaxed', 'back_flexed')),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NUTRITION LOGS
-- ============================================
CREATE TABLE public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calories INT,
  protein_g NUMERIC(5,1),
  carbs_g NUMERIC(5,1),
  fat_g NUMERIC(5,1),
  supplements_used TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ============================================
-- PERSONAL RECORDS
-- ============================================
CREATE TABLE public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL,
  reps INT NOT NULL,
  estimated_1rm NUMERIC(6,2),
  achieved_date DATE NOT NULL,
  session_id UUID REFERENCES public.workout_sessions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_sessions_user_date ON public.workout_sessions(user_id, session_date DESC);
CREATE INDEX idx_sessions_week ON public.workout_sessions(user_id, week_number);
CREATE INDEX idx_sets_session ON public.workout_sets(session_id);
CREATE INDEX idx_sets_exercise ON public.workout_sets(exercise_name, created_at DESC);
CREATE INDEX idx_body_metrics_user_date ON public.body_metrics(user_id, date DESC);
CREATE INDEX idx_nutrition_user_date ON public.nutrition_logs(user_id, date DESC);
CREATE INDEX idx_prs_user_exercise ON public.personal_records(user_id, exercise_name);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users access own sessions" ON public.workout_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own sets" ON public.workout_sets
  FOR ALL USING (
    session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users access own metrics" ON public.body_metrics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own photos" ON public.progress_photos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own nutrition" ON public.nutrition_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own prs" ON public.personal_records
  FOR ALL USING (auth.uid() = user_id);

-- Programme tables: allow authenticated read
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read blocks" ON public.blocks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users read days" ON public.programme_days
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users read exercises" ON public.programme_exercises
  FOR SELECT USING (auth.role() = 'authenticated');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
