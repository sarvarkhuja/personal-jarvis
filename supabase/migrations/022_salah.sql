-- 022_salah.sql
-- Salah (five daily prayers) tracker. Follows the habit_logs pattern:
-- references auth.users(id), split RLS policies, log_date derived server-side.
--
-- salah_logs: one row per prayer per day (real unique constraint, unlike
-- habit_logs). Stored statuses are on_time|late|qada; "missed" is derived
-- from the absence of a row for a prayer whose window has passed.
-- salah_settings: optional per-user calc config. If absent, code falls back
-- to TASHKENT_DEFAULT, so no trigger/auto-seed is needed.

CREATE TABLE IF NOT EXISTS public.salah_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prayer     TEXT NOT NULL CHECK (prayer IN ('fajr','dhuhr','asr','maghrib','isha')),
  log_date   DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('on_time','late','qada')),
  jamaat     TEXT CHECK (jamaat IN ('alone','jamaat','masjid')),
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, prayer, log_date)
);

CREATE INDEX IF NOT EXISTS idx_salah_logs_user_date
  ON public.salah_logs (user_id, log_date DESC);

ALTER TABLE public.salah_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salah_logs_select_own" ON public.salah_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "salah_logs_insert_own" ON public.salah_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salah_logs_update_own" ON public.salah_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salah_logs_delete_own" ON public.salah_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.salah_settings (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  city                TEXT    NOT NULL DEFAULT 'Tashkent',
  latitude            NUMERIC NOT NULL DEFAULT 41.2995,
  longitude           NUMERIC NOT NULL DEFAULT 69.2401,
  timezone            TEXT    NOT NULL DEFAULT 'Asia/Tashkent',
  fajr_angle          NUMERIC NOT NULL DEFAULT 15.5,
  isha_angle          NUMERIC NOT NULL DEFAULT 15.5,
  isha_interval       INTEGER NOT NULL DEFAULT 0,
  madhab              TEXT    NOT NULL DEFAULT 'hanafi' CHECK (madhab IN ('hanafi','shafi')),
  offset_fajr         INTEGER NOT NULL DEFAULT 0,
  offset_dhuhr        INTEGER NOT NULL DEFAULT 0,
  offset_asr          INTEGER NOT NULL DEFAULT 0,
  offset_maghrib      INTEGER NOT NULL DEFAULT 3,
  offset_isha         INTEGER NOT NULL DEFAULT 0,
  late_after_fraction NUMERIC NOT NULL DEFAULT 0.6667
    CHECK (late_after_fraction >= 0 AND late_after_fraction <= 1),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salah_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salah_settings_select_own" ON public.salah_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "salah_settings_insert_own" ON public.salah_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salah_settings_update_own" ON public.salah_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salah_settings_delete_own" ON public.salah_settings
  FOR DELETE USING (auth.uid() = user_id);
