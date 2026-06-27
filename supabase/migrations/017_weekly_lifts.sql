-- Weekly lift logger: one row per (user, lift, week). Reps is the tracked headline;
-- weight pre-fills from the prior week. Replaces the read-only personal_records view.
CREATE TABLE public.weekly_lifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL CHECK (exercise IN
    ('bench','squat','deadlift','overhead_press','pull_ups')),
  week_start DATE NOT NULL,           -- Monday (UTC) of the week
  weight_kg NUMERIC(6,2),             -- nullable; null = bodyweight (pull-ups)
  reps INT NOT NULL CHECK (reps >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, exercise, week_start)
);

CREATE INDEX idx_weekly_lifts_user_exercise
  ON public.weekly_lifts(user_id, exercise, week_start DESC);

ALTER TABLE public.weekly_lifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own weekly lifts" ON public.weekly_lifts
  FOR ALL USING (auth.uid() = user_id);
