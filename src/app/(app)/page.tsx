import { createClient } from '@/lib/supabase/server'
import { getCurrentProgrammePosition } from '@/lib/utils/week-calculator'
import { redirect } from 'next/navigation'
import { JarvisDashboard } from '@/components/dashboard/JarvisDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Initial auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Date constants
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  // Phase 1: All independent queries running in parallel
  // These only depend on `user.id`.
  const profilePromise = supabase.from('profiles').select('programme_start_date, display_name, target_weight_kg').eq('id', user.id).single()
  const latestWeightPromise = supabase.from('body_metrics').select('weight_kg, date').eq('user_id', user.id).order('date', { ascending: false }).limit(1).single()
  const goalsPromise = supabase.from('goals').select('id, user_id, title, description, target_value, current_value, unit, deadline, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
  const expensesPromise = supabase.from('expenses').select('id, user_id, amount_pence, currency, category, description, date, created_at').eq('user_id', user.id).gte('date', sixMonthsAgoStr).order('date', { ascending: false })
  const focusAreasPromise = supabase.from('focus_areas').select('id, user_id, name, emoji, sort_order, is_active, created_at').eq('user_id', user.id).order('sort_order')
  const focusCheckinsPromise = supabase.from('focus_checkins').select('id, user_id, focus_area_id, date, created_at').eq('user_id', user.id).gte('date', thirtyDaysAgoStr)
  const habitsPromise = supabase.from('habits').select('id, user_id, name, emoji, sort_order, is_active, created_at').eq('user_id', user.id).order('sort_order')
  const habitCompletionsPromise = supabase.from('habit_completions').select('id, user_id, habit_id, date, created_at').eq('user_id', user.id).gte('date', thirtyDaysAgoStr)
  const disciplineScoresPromise = supabase.from('discipline_scores').select('id, user_id, date, score, notes, created_at').eq('user_id', user.id).gte('date', thirtyDaysAgoStr).order('date', { ascending: false })

  const [
    profileResult,
    latestWeightResult,
    goalsResult,
    expensesResult,
    focusAreasResult,
    focusCheckinsResult,
    habitsResult,
    habitCompletionsResult,
    disciplineScoresResult,
  ] = await Promise.all([
    profilePromise, latestWeightPromise, goalsPromise, expensesPromise, 
    focusAreasPromise, focusCheckinsPromise, habitsPromise, 
    habitCompletionsPromise, disciplineScoresPromise
  ])

  // Phase 2: Compute programme position
  const profile = profileResult.data
  const startDate = profile?.programme_start_date
    ? new Date(profile.programme_start_date)
    : new Date()
  const position = getCurrentProgrammePosition(startDate)

  const today = new Date().toISOString().split('T')[0]
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  // Phase 3: Run position-dependent queries
  const blocksPromise = supabase
    .from('blocks')
    .select('id')
    .lte('week_start', position.weekNumber)
    .gte('week_end', position.weekNumber)
    .single()
    
  const weekSessionsPromise = supabase
    .from('workout_sessions')
    .select('session_date')
    .eq('user_id', user.id)
    .eq('week_number', position.weekNumber)
    .gte('session_date', weekStartStr)

  const [blocksResult, weekSessionsResult] = await Promise.all([blocksPromise, weekSessionsPromise])

  // Phase 4: todayDay depends on blocks
  const { data: todayDay } = blocksResult.data
    ? await supabase
        .from('programme_days')
        .select('id, name, emphasis')
        .eq('block_id', blocksResult.data.id)
        .eq('day_of_week', position.dayOfWeek)
        .single()
    : { data: null }

  const completedDows = (weekSessionsResult.data ?? []).map(
    s => new Date(s.session_date).getDay()
  )

  return (
    <JarvisDashboard
      displayName={profile?.display_name ?? null}
      position={position}
      todayDay={todayDay ?? null}
      completedDows={completedDows}
      latestWeight={latestWeightResult.data ?? null}
      targetWeightKg={profile?.target_weight_kg ?? null}
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
