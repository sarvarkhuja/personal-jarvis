'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addHabit(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('habits').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    emoji: (formData.get('emoji') as string) || '✅',
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

export async function saveDisciplineScore(date: string, score: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Upsert: insert or update if date already has a score
  const { error } = await supabase.from('discipline_scores').upsert(
    { user_id: user.id, date, score },
    { onConflict: 'user_id,date' }
  )

  if (error) return { error: error.message }
  revalidatePath('/')
}
