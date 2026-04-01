'use client'

import { useTransition } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Expense } from '@/types'
import { addExpense, deleteExpense } from '@/actions/expenses'
import { aggregateExpensesByMonth, lastNMonthKeys, formatPence } from '@/lib/utils/dashboard-utils'

const CATEGORIES = ['food', 'transport', 'shopping', 'entertainment', 'health', 'other'] as const
const CATEGORY_COLORS: Record<string, string> = {
  food: 'var(--warning)', transport: 'var(--interactive)', shopping: 'var(--text-primary)',
  entertainment: 'var(--accent)', health: 'var(--success)', other: 'var(--text-disabled)',
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
    month: new Date(key + '-01').toLocaleString('en-GB', { month: 'short' }).toUpperCase(),
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
    <div className="space-y-8 max-w-4xl w-full">
      {/* Month headline - Hero Level */}
      <div className="bg-surface border border-border rounded-lg p-8">
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-4">
          [ {new Date(today).toLocaleString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()} TOTAL ]
        </div>
        <div className="flex flex-col md:flex-row md:items-baseline gap-4">
          <span className="font-doto text-6xl font-bold tracking-tight text-warning leading-none">{formatPence(thisMonthTotal)}</span>
          {prevMonthTotal > 0 && (
            <span className={`font-mono text-[11px] tracking-[0.08em] uppercase ${delta > 0 ? 'text-text-primary' : 'text-success'}`}>
              [{delta > 0 ? '+' : '-'}{formatPence(Math.abs(delta))} VS LAST MONTH]
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 6-month chart */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-8">[ 6-MONTH TREND ]</div>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--text-disabled)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-background border border-border-visible px-3 py-2 font-mono text-[11px] tracking-[0.08em] uppercase text-warning">
                        £{payload[0].value?.toString()}
                      </div>
                    )
                  }}
                />
                <Bar dataKey="total" radius={[0, 0, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isCurrent ? 'var(--warning)' : 'var(--border-visible)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown */}
        {Object.keys(categoryTotals).length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-8">[ BY CATEGORY ]</div>
              <div className="space-y-4">
                {Object.entries(categoryTotals)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, pence]) => {
                    const pct = thisMonthTotal > 0 ? (pence / thisMonthTotal) * 100 : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between mb-2">
                          <span className="font-mono text-[11px] tracking-[0.08em] uppercase" style={{ color: CATEGORY_COLORS[cat] }}>
                            {cat}
                          </span>
                          <span className="font-mono text-[11px] tracking-[0.08em] text-text-primary">{formatPence(pence)}</span>
                        </div>
                        <div className="flex gap-[2px] h-[6px]">
                          {Array.from({ length: 25 }).map((_, i) => {
                            const isFilled = i < pct / 4;
                            return (
                              <div
                                key={i}
                                className={`flex-[1_0_0%] ${isFilled ? 'bg-text-display' : 'bg-border'}`}
                                style={{ backgroundColor: isFilled ? CATEGORY_COLORS[cat] : 'var(--border)' }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add expense form */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ ADD EXPENSE ]</div>
        <form action={handleAdd} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
            className="bg-transparent border-b border-border-visible py-2 font-mono text-[13px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors"
          />
          <select
            name="category"
            required
            className="bg-transparent border-b border-border-visible py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-text-primary focus:outline-none focus:border-text-primary transition-colors appearance-none cursor-pointer"
          >
            <option value="" disabled className="bg-surface text-text-disabled text-[13px]">SELECT CATEGORY</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c} className="bg-surface text-text-primary">{c}</option>
            ))}
          </select>
          <input
            name="description"
            type="text"
            placeholder="DESCRIPTION"
            className="bg-transparent border-b border-border-visible py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors"
          />
          <input
            name="date"
            type="date"
            defaultValue={today}
            required
            className="bg-transparent border-b border-border-visible py-2 font-mono text-[13px] text-text-primary focus:outline-none focus:border-text-primary transition-colors uppercase tracking-[0.08em] appearance-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="col-span-2 md:col-span-4 mt-4 bg-text-display text-background font-mono text-[13px] tracking-[0.06em] uppercase h-11 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? '[ ADDING ]' : 'ADD EXPENSE'}
          </button>
        </form>
      </div>

      {/* Recent transactions */}
      {thisMonthExpenses.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ TRANSACTIONS ]</div>
          <div className="space-y-0">
            {thisMonthExpenses.map((expense, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-border' : ''}`}
                >
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-[11px] tracking-[0.08em] text-text-disabled uppercase">
                      {new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.08em] text-text-secondary uppercase w-20 truncate" title={expense.category}>
                      {expense.category}
                    </span>
                    {expense.description && (
                      <span className="font-mono text-[11px] tracking-[0.08em] text-text-primary uppercase truncate max-w-40 md:max-w-64">
                        {expense.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] tracking-[0.08em] text-warning">{formatPence(expense.amount_pence)}</span>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={isPending}
                      className="font-mono text-[11px] tracking-[0.08em] text-text-disabled hover:text-accent transition-colors"
                      title="Delete"
                    >
                      [✕]
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
