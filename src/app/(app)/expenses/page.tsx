import { createClient } from '@/lib/supabase/server'
import { requireUserId } from '@/lib/auth/server-user'
import { ExpensesView } from '@/components/expenses/ExpensesView'

export default async function ExpensesPage() {
  const userId = await requireUserId()
  const supabase = await createClient()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, user_id, amount, currency, category, description, date, created_at')
    .eq('user_id', userId)
    .gte('date', sixMonthsAgoStr)
    .order('date', { ascending: false })

  const today = new Date().toISOString().split('T')[0]

  return <ExpensesView expenses={expenses ?? []} today={today} />
}
