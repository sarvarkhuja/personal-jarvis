'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const targetStr = formData.get('target_value') as string
  const target_value = targetStr ? parseFloat(targetStr) : null

  const { error } = await supabase.from('goals').insert({
    user_id: user.id,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    target_value,
    current_value: 0,
    unit: (formData.get('unit') as string) || null,
    deadline: (formData.get('deadline') as string) || null,
    status: 'active',
  })

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function updateGoalProgress(id: string, currentValue: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('goals')
    .update({ current_value: currentValue })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function completeGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('goals')
    .update({ status: 'completed' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
}
