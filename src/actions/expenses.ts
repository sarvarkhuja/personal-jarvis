'use server'

import { invalidateUserData } from '@/lib/data/invalidate'
import { createClient } from '@/lib/supabase/action'
import { tryGetUserId } from '@/lib/auth/server-user'

export async function addExpense(formData: FormData) {
  const userId = await tryGetUserId()
  if (!userId) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const rawAmount = (formData.get('amount') as string | null)?.replace(/[^\d]/g, '') ?? ''
  const amount = parseInt(rawAmount, 10)
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Invalid amount' }

  const { error } = await supabase.from('expenses').insert({
    user_id: userId,
    amount,
    currency: 'UZS',
    category: formData.get('category') as string,
    description: (formData.get('description') as string) || null,
    date: formData.get('date') as string,
  })

  if (error) return { error: error.message }
  invalidateUserData(userId, 'expenses')
}

export async function deleteExpense(id: string) {
  const userId = await tryGetUserId()
  if (!userId) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  invalidateUserData(userId, 'expenses')
}
