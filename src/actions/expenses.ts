'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amountStr = formData.get('amount') as string
  const amount_pence = Math.round(parseFloat(amountStr) * 100)
  if (isNaN(amount_pence) || amount_pence <= 0) return { error: 'Invalid amount' }

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    amount_pence,
    category: formData.get('category') as string,
    description: (formData.get('description') as string) || null,
    date: formData.get('date') as string,
  })

  if (error) return { error: error.message }
  revalidatePath('/')
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
}
