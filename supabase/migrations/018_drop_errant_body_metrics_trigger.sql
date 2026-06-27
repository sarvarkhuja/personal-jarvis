-- Remove a stray dashboard-created trigger ("test") that mistakenly attached the
-- internal realtime.subscription_check_filters() function to body_metrics. That
-- function references NEW.entity, which body_metrics does not have, so every
-- insert/update/delete on body_metrics failed with:
--   upsertBodyMetrics failed: record "new" has no field "entity"
-- The trigger was never part of any migration (created via the dashboard).
DROP TRIGGER IF EXISTS test ON public.body_metrics;
