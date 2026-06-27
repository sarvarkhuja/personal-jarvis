-- supabase/migrations/009_goal_progress.sql
-- Run in Supabase Dashboard → SQL Editor.
-- View `goal_progress`: for each goal with linked_habit_id, count habit_logs
-- since the goal was created and divide by progress_target.
--
-- security_invoker so SELECT-from-view runs as the caller and respects RLS on
-- both `goals` and `habit_logs` (otherwise the view would leak across users).

CREATE OR REPLACE VIEW public.goal_progress
WITH (security_invoker = on)
AS
SELECT
  g.id            AS goal_id,
  g.user_id,
  g.title,
  g.linked_habit_id,
  g.progress_target,
  g.progress_unit,
  COALESCE((
    SELECT COUNT(*)
    FROM public.habit_logs hl
    WHERE hl.habit_id = g.linked_habit_id
      AND hl.user_id = g.user_id
      AND hl.logged_at >= g.created_at
  ), 0)::numeric AS progress_count,
  CASE
    WHEN g.progress_target IS NULL OR g.progress_target = 0 THEN NULL
    ELSE LEAST(
      1.0,
      COALESCE((
        SELECT COUNT(*)::numeric
        FROM public.habit_logs hl
        WHERE hl.habit_id = g.linked_habit_id
          AND hl.user_id = g.user_id
          AND hl.logged_at >= g.created_at
      ), 0) / g.progress_target
    )
  END             AS progress_ratio
FROM public.goals g
WHERE g.linked_habit_id IS NOT NULL;
