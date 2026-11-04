-- Retire the Expenses and Plans features: the app no longer reads or writes
-- either table (removed /expenses, /plans, the spend glance and the agenda cards).
--
-- DESTRUCTIVE: permanently deletes every expense and event row. Take a backup
-- first if the data matters (e.g. `supabase db dump --data-only -t public.expenses -t public.events`).
--
-- No CASCADE on purpose: indexes, RLS policies and triggers owned by these tables
-- are dropped with them, but if anything else still depends on them (a view or a
-- dashboard-created object) this fails loudly instead of silently dropping it too.
-- Re-runnable.

drop table if exists public.expenses;
drop table if exists public.events;
