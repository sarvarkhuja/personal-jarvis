'use client'

import { useTransition } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Button } from '@/components/ui/button'
import type { Expense } from '@/types'
import { addExpense, deleteExpense } from '@/actions/expenses'
import { aggregateExpensesByMonth, lastNMonthKeys, formatPence } from '@/lib/utils/dashboard-utils'

const CATEGORIES = ['food', 'transport', 'shopping', 'entertainment', 'health', 'other'] as const
const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b', transport: '#06b6d4', shopping: '#a855f7',
  entertainment: '#ec4899', health: '#22c55e', other: '#6b7280',
}

interface ExpensesTabProps {
  expenses: Expense[]
  today: string
}

export function ExpensesTab({ expenses, today }: ExpensesTabProps) {
  const [isPending, startTransition] = useTransition()

  const thisMonth = today.slice(0, 7)
  const prevMonth = new Date(today)
  prevMonth.setMonth(prevMonth.getMonth() - 1)
  const prevMonthKey = prevMonth.toISOString().slice(0, 7)

  const monthlyTotals = aggregateExpensesByMonth(expenses)
  const thisMonthTotal = monthlyTotals[thisMonth] ?? 0
  const prevMonthTotal = monthlyTotals[prevMonthKey] ?? 0
  const delta = thisMonthTotal - prevMonthTotal

  const monthKeys = lastNMonthKeys(6)
  const chartData = monthKeys.map(key => ({
    month: new Date(key + '-01').toLocaleString('en-GB', { month: 'short' }),
    total: (monthlyTotals[key] ?? 0) / 100,
    isCurrent: key === thisMonth,
  }))

  const thisMonthExpenses = expenses
    .filter(e => e.date.startsWith(thisMonth))
    .sort((a, b) => b.date.localeCompare(a.date))

  const categoryTotals = thisMonthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_pence
    return acc
  }, {})

  function handleAdd(formData: FormData) {
    startTransition(() => { addExpense(formData) })
  }

  function handleDelete(id: string) {
    startTransition(() => { deleteExpense(id) })
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Month headline */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-1">
          {new Date(today).toLocaleString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()}
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-3xl font-bold text-amber-400">{formatPence(thisMonthTotal)}</span>
          {prevMonthTotal > 0 && (
            <span className={`font-mono text-xs ${delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {delta > 0 ? '↑' : '↓'} {formatPence(Math.abs(delta))} vs last month
            </span>
          )}
        </div>
      </div>

      {/* 6-month chart */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">6-Month Trend</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} barCategoryGap="30%">
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fontFamily: 'var(--font-geist-mono)', fill: '#444' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: '#ffffff08' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-[#111] border border-[#222] rounded px-2 py-1 font-mono text-[10px] text-amber-400">
                    £{payload[0].value?.toString()}
                  </div>
                )
              }}
            />
            <Bar dataKey="total" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isCurrent ? '#f59e0b' : '#1a1a1a'}
                  stroke={entry.isCurrent ? '#f59e0b66' : '#222'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">By Category</div>
          <div className="space-y-2">
            {Object.entries(categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, pence]) => {
                const pct = thisMonthTotal > 0 ? (pence / thisMonthTotal) * 100 : 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] capitalize" style={{ color: CATEGORY_COLORS[cat] }}>
                        {cat}
                      </span>
                      <span className="font-mono text-[10px] text-[#444]">{formatPence(pence)}</span>
                    </div>
                    <div className="h-[3px] bg-[#111] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Add expense form */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Add Expense</div>
        <form action={handleAdd} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
            className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-amber-500/50"
          />
          <select
            name="category"
            required
            className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] focus:outline-none focus:border-amber-500/50"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            name="description"
            type="text"
            placeholder="Description"
            className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-amber-500/50"
          />
          <input
            name="date"
            type="date"
            defaultValue={today}
            required
            className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] focus:outline-none focus:border-amber-500/50"
          />
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            variant="outline"
            className="col-span-2 md:col-span-4 font-mono text-[10px] tracking-widest border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            {isPending ? 'ADDING...' : '+ ADD EXPENSE'}
          </Button>
        </form>
      </div>

      {/* Recent transactions */}
      {thisMonthExpenses.length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Transactions</div>
          <div className="space-y-0">
            {thisMonthExpenses.map(expense => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-[#111] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] text-[#333]">
                    {new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="font-mono text-[10px] text-[#666] capitalize">{expense.category}</span>
                  {expense.description && (
                    <span className="font-mono text-[10px] text-[#444] truncate max-w-32">{expense.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-amber-400">{formatPence(expense.amount_pence)}</span>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    disabled={isPending}
                    className="font-mono text-[9px] text-[#333] hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
