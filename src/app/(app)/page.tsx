import { createClient } from '@/lib/supabase/server'
import { JarvisDashboard } from '@/components/dashboard/JarvisDashboard'
import { requireUserId } from '@/lib/auth/server-user'

export default async function DashboardPage() {
  const userId = await requireUserId()
  const supabase = await createClient()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const [
    profileResult,
    goalsResult,
    expensesResult,
    focusAreasResult,
    focusCheckinsResult,
    habitsResult,
    habitCompletionsResult,
    disciplineScoresResult,
  ] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', userId).single(),
    supabase.from('goals').select('id, user_id, title, description, target_value, current_value, unit, deadline, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('expenses').select('id, user_id, amount, currency, category, description, date, created_at').eq('user_id', userId).gte('date', sixMonthsAgoStr).order('date', { ascending: false }),
    supabase.from('focus_areas').select('id, user_id, name, emoji, sort_order, is_active, created_at').eq('user_id', userId).order('sort_order'),
    supabase.from('focus_checkins').select('id, user_id, focus_area_id, date, created_at').eq('user_id', userId).gte('date', thirtyDaysAgoStr),
    supabase.from('habits').select('id, user_id, goal_id, name, emoji, sort_order, is_active, created_at').eq('user_id', userId).order('sort_order'),
    supabase.from('habit_completions').select('id, user_id, habit_id, date, created_at').eq('user_id', userId).gte('date', thirtyDaysAgoStr),
    supabase.from('discipline_scores').select('id, user_id, date, score, notes, created_at').eq('user_id', userId).gte('date', thirtyDaysAgoStr).order('date', { ascending: false }),
  ])

  const today = new Date().toISOString().split('T')[0]

  return (
    <JarvisDashboard
      displayName={profileResult.data?.display_name ?? null}
      goals={goalsResult.data ?? []}
      expenses={expensesResult.data ?? []}
      focusAreas={focusAreasResult.data ?? []}
      focusCheckins={focusCheckinsResult.data ?? []}
      habits={habitsResult.data ?? []}
      habitCompletions={habitCompletionsResult.data ?? []}
      disciplineScores={disciplineScoresResult.data ?? []}
      today={today}
    />
  )
}
