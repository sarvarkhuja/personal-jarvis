'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const rawAmount = (formData.get('amount') as string | null)?.replace(/[^\d]/g, '') ?? ''
  const amount = parseInt(rawAmount, 10)
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Invalid amount' }

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    amount,
    currency: 'UZS',
    category: formData.get('category') as string,
    description: (formData.get('description') as string) || null,
    date: formData.get('date') as string,
  })

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/expenses')
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/expenses')
}
