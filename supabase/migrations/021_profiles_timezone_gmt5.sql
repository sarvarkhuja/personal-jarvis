-- 021_profiles_timezone_gmt5.sql
-- Set the app timezone to GMT+5 (Asia/Tashkent, no DST).
--
-- The per-user timezone architecture was already in place: profiles.timezone
-- feeds toUserDate()/userDayBounds() (src/lib/domain/timezone.ts), which every
-- date-aware page reads. It just defaulted to 'UTC' (migration 004), so every
-- "today" resolved in UTC. Set existing rows and the column default to GMT+5.
--
-- handle_new_user() inserts only (id, email) and omits timezone, so new
-- profiles inherit this default automatically -- no trigger change needed.

UPDATE public.profiles
SET timezone = 'Asia/Tashkent'
WHERE timezone = 'UTC';

ALTER TABLE public.profiles
  ALTER COLUMN timezone SET DEFAULT 'Asia/Tashkent';
