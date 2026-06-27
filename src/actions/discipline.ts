'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addHabit(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string | null)?.trim()
  const goalId = (formData.get('goal_id') as string | null)?.trim()
  const emoji = (formData.get('emoji') as string | null) || '✅'

  if (!name) return { error: 'NAME_REQUIRED' }
  if (!goalId) return { error: 'GOAL_REQUIRED' }

  const { data: goalRow } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .maybeSingle()
  if (!goalRow) return { error: 'GOAL_NOT_FOUND' }

  const { error } = await supabase.from('habits').insert({
    user_id: user.id,
    goal_id: goalId,
    name,
    emoji,
  })

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function toggleHabitCompletion(habitId: string, date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.rpc('toggle_habit_completion', {
    p_user_id: user.id,
    p_habit_id: habitId,
    p_date: date,
  })

  if (error) return { error: error.message }

  revalidatePath('/')
}
