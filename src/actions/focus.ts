'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addFocusArea(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('focus_areas').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    emoji: (formData.get('emoji') as string) || '🎯',
  })

  if (error) return { error: error.message }
  revalidatePath('/')
}

export async function toggleCheckin(focusAreaId: string, date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Check if checkin already exists
  const { data: existing } = await supabase
    .from('focus_checkins')
    .select('id')
    .eq('user_id', user.id)
    .eq('focus_area_id', focusAreaId)
    .eq('date', date)
    .single()

  if (existing) {
    // Remove checkin
    await supabase.from('focus_checkins').delete().eq('id', existing.id)
  } else {
    // Add checkin
    await supabase.from('focus_checkins').insert({
      user_id: user.id,
      focus_area_id: focusAreaId,
      date,
    })
  }

  revalidatePath('/')
}
