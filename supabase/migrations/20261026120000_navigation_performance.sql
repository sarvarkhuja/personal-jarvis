-- Additive indexes matching the app's existing navigation reads.
-- Prepared locally; not applied to the linked database by the performance fix.

-- Goals are filtered by user on multiple routes; the full list is ordered by
-- created_at. The leading user_id also supports the ownership predicate.
CREATE INDEX IF NOT EXISTS idx_goals_user_created
  ON public.goals (user_id, created_at);

-- Workout loads a user's four newest progress photos.
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date
  ON public.progress_photos (user_id, date DESC);

-- Today uses a UTC timestamp range for the user's local day. The existing
-- (user_id, log_date) index does not index this logged_at range.
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_logged_at
  ON public.habit_logs (user_id, logged_at);
