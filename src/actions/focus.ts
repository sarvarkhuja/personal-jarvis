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

  // Use the atomic Postgres RPC to toggle without race conditions
  const { error } = await supabase.rpc('toggle_focus_checkin', {
    p_user_id: user.id,
    p_focus_area_id: focusAreaId,
    p_date: date,
  })

  if (error) return { error: error.message }

  revalidatePath('/')
}
