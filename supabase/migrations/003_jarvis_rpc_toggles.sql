-- supabase/migrations/003_jarvis_rpc_toggles.sql
-- Atomic toggle functions to avoid race conditions via select-then-insert/delete
-- This aligns with Supabase Postgres performance rules (data access best practices)

-- Toggle for Habit Completions
CREATE OR REPLACE FUNCTION toggle_habit_completion(
  p_user_id UUID,
  p_habit_id UUID,
  p_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Attempt to delete. IF found, it will be deleted and FOUND will be true.
  DELETE FROM public.habit_completions 
  WHERE user_id = p_user_id 
    AND habit_id = p_habit_id 
    AND date = p_date;
  
  -- If not deleted, insert it
  IF NOT FOUND THEN
    INSERT INTO public.habit_completions (user_id, habit_id, date) 
    VALUES (p_user_id, p_habit_id, p_date);
  END IF;
END;
$$;

-- Toggle for Focus Check-ins
CREATE OR REPLACE FUNCTION toggle_focus_checkin(
  p_user_id UUID,
  p_focus_area_id UUID,
  p_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Attempt to delete
  DELETE FROM public.focus_checkins 
  WHERE user_id = p_user_id 
    AND focus_area_id = p_focus_area_id 
    AND date = p_date;
    
  -- If not deleted, insert it
  IF NOT FOUND THEN
    INSERT INTO public.focus_checkins (user_id, focus_area_id, date) 
    VALUES (p_user_id, p_focus_area_id, p_date);
  END IF;
END;
$$;
