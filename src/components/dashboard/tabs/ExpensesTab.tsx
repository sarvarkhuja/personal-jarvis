'use client'

import { useRef, useState, useTransition } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Expense } from '@/types'
import { addExpense, deleteExpense } from '@/actions/expenses'
import {
  aggregateExpensesByMonth,
  lastNMonthKeys,
  formatUzs,
  formatUzsCompact,
} from '@/lib/utils/dashboard-utils'

const CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍽' },
  { id: 'transport', label: 'Transport', emoji: '🚕' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍' },
  { id: 'entertainment', label: 'Fun', emoji: '🎬' },
  { id: 'health', label: 'Health', emoji: '💊' },
  { id: 'other', label: 'Other', emoji: '✦' },
] as const

const CATEGORY_COLORS: Record<string, string> = {
  food: 'var(--warning)',
  transport: 'var(--interactive)',
  shopping: 'var(--text-primary)',
  entertainment: 'var(--accent)',
  health: 'var(--success)',
  other: 'var(--text-disabled)',
}

const CATEGORY_EMOJI: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c.emoji])
)

const QUICK_AMOUNTS = [10_000, 25_000, 50_000, 100_000, 250_000]

const NUMBER_FORMAT = new Intl.NumberFormat('en-US')

interface ExpensesTabProps {
  expenses: Expense[]
  today: string
}

export function ExpensesTab({ expenses, today }: ExpensesTabProps) {
  const [isPending, startTransition] = useTransition()
  const [amountDigits, setAmountDigits] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('food')
  const [date, setDate] = useState(today)
  const formRef = useRef<HTMLFormElement>(null)

  const yesterday = (() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()

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
    total: monthlyTotals[key] ?? 0,
    isCurrent: key === thisMonth,
  }))

  const thisMonthExpenses = expenses
    .filter(e => e.date.startsWith(thisMonth))
    .sort((a, b) => b.date.localeCompare(a.date))

  const categoryTotals = thisMonthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})

  const amountValue = amountDigits ? parseInt(amountDigits, 10) : 0
  const isFormValid = amountValue > 0 && Boolean(selectedCategory) && Boolean(date)

  function handleAmountChange(raw: string) {
    const digits = raw.replace(/[^\d]/g, '').slice(0, 12)
    setAmountDigits(digits)
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addExpense(formData)
      setAmountDigits('')
      setSelectedCategory('food')
      setDate(today)
      formRef.current?.reset()
    })
  }

  function handleDelete(id: string) {
    startTransition(() => {
      deleteExpense(id)
    })
  }

  return (
    <div className="space-y-8 max-w-4xl w-full">
      {/* Month headline */}
      <div className="bg-surface border border-border rounded-lg p-8">
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-4">
          [ {new Date(today).toLocaleString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase()} TOTAL ]
        </div>
        <div className="flex flex-col md:flex-row md:items-baseline gap-4">
          <span className="font-doto text-5xl md:text-6xl font-bold tracking-tight text-warning leading-none">
            {formatUzs(thisMonthTotal)}
          </span>
          {prevMonthTotal > 0 && (
            <span
              className={`font-mono text-[11px] tracking-[0.08em] uppercase ${
                delta > 0 ? 'text-text-primary' : 'text-success'
              }`}
            >
              [{delta > 0 ? '+' : '-'}
              {formatUzsCompact(Math.abs(delta))} VS LAST MONTH]
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 6-month chart */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-8">
            [ 6-MONTH TREND ]
          </div>
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
                        {formatUzsCompact(Number(payload[0].value ?? 0))}
                      </div>
                    )
                  }}
                />
                <Bar dataKey="total" radius={[0, 0, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isCurrent ? 'var(--warning)' : 'var(--border-visible)'} />
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
              <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-8">
                [ BY CATEGORY ]
              </div>
              <div className="space-y-4">
                {Object.entries(categoryTotals)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => {
                    const pct = thisMonthTotal > 0 ? (amount / thisMonthTotal) * 100 : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between mb-2">
                          <span
                            className="font-mono text-[11px] tracking-[0.08em] uppercase"
                            style={{ color: CATEGORY_COLORS[cat] }}
                          >
                            {CATEGORY_EMOJI[cat]} {cat}
                          </span>
                          <span className="font-mono text-[11px] tracking-[0.08em] text-text-primary">
                            {formatUzsCompact(amount)}
                          </span>
                        </div>
                        <div className="flex gap-[2px] h-[6px]">
                          {Array.from({ length: 25 }).map((_, i) => {
                            const isFilled = i < pct / 4
                            return (
                              <div
                                key={i}
                                className="flex-[1_0_0%]"
                                style={{
                                  backgroundColor: isFilled ? CATEGORY_COLORS[cat] : 'var(--border)',
                                }}
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
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">
          [ ADD EXPENSE ]
        </div>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div>
            <label className="font-mono text-[10px] tracking-[0.08em] uppercase text-text-secondary block mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                name="amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                required
                value={amountDigits ? NUMBER_FORMAT.format(amountValue) : ''}
                onChange={e => handleAmountChange(e.target.value)}
                className="w-full bg-transparent border-b border-border-visible py-3 pr-16 font-doto text-3xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[11px] tracking-[0.08em] uppercase text-text-disabled pointer-events-none">
                so&apos;m
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_AMOUNTS.map(value => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setAmountDigits(String(value))}
                  className="font-mono text-[10px] tracking-[0.08em] uppercase px-3 py-1 border border-border-visible rounded-full text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors"
                >
                  +{formatUzsCompact(value)}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="font-mono text-[10px] tracking-[0.08em] uppercase text-text-secondary block mb-2">
              Category
            </label>
            <input type="hidden" name="category" value={selectedCategory} />
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {CATEGORIES.map(c => {
                const isActive = selectedCategory === c.id
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    aria-pressed={isActive}
                    className={`flex flex-col items-center gap-1 py-3 rounded-lg border transition-colors ${
                      isActive
                        ? 'border-text-primary bg-background text-text-primary'
                        : 'border-border text-text-secondary hover:text-text-primary hover:border-border-visible'
                    }`}
                  >
                    <span className="text-lg leading-none">{c.emoji}</span>
                    <span className="font-mono text-[10px] tracking-[0.08em] uppercase">{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description + date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="font-mono text-[10px] tracking-[0.08em] uppercase text-text-secondary block mb-2">
                Note (optional)
              </label>
              <input
                name="description"
                type="text"
                placeholder="e.g. Lunch with team"
                className="w-full bg-transparent border-b border-border-visible py-2 font-mono text-[13px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.08em] uppercase text-text-secondary block mb-2">
                Date
              </label>
              <input
                name="date"
                type="date"
                value={date}
                required
                onChange={e => setDate(e.target.value)}
                className="w-full bg-transparent border-b border-border-visible py-2 font-mono text-[13px] text-text-primary focus:outline-none focus:border-text-primary transition-colors uppercase tracking-[0.08em] appearance-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setDate(today)}
                  className={`font-mono text-[10px] tracking-[0.08em] uppercase px-2 py-1 border rounded-full transition-colors ${
                    date === today
                      ? 'border-text-primary text-text-primary'
                      : 'border-border-visible text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(yesterday)}
                  className={`font-mono text-[10px] tracking-[0.08em] uppercase px-2 py-1 border rounded-full transition-colors ${
                    date === yesterday
                      ? 'border-text-primary text-text-primary'
                      : 'border-border-visible text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !isFormValid}
            className="w-full bg-text-display text-background font-mono text-[13px] tracking-[0.06em] uppercase h-12 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending
              ? '[ ADDING ]'
              : amountValue > 0
                ? `Add ${formatUzs(amountValue)}`
                : 'Enter an amount'}
          </button>
        </form>
      </div>

      {/* Recent transactions */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary">
            [ TRANSACTIONS · {thisMonthExpenses.length} ]
          </div>
        </div>
        {thisMonthExpenses.length === 0 ? (
          <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-disabled py-4">
            No expenses yet this month — add your first one above.
          </p>
        ) : (
          <div className="space-y-0">
            {thisMonthExpenses.map((expense, idx, arr) => {
              const isLast = idx === arr.length - 1
              return (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-border' : ''}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className="text-base shrink-0"
                      style={{ color: CATEGORY_COLORS[expense.category] }}
                      aria-hidden
                    >
                      {CATEGORY_EMOJI[expense.category] ?? '✦'}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-[12px] tracking-[0.04em] text-text-primary truncate">
                        {expense.description || expense.category.toUpperCase()}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-text-disabled">
                        {new Date(expense.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                        })}
                        {' · '}
                        {expense.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-mono text-[12px] tracking-[0.04em] text-warning tabular-nums">
                      {formatUzs(expense.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={isPending}
                      className="font-mono text-[11px] tracking-[0.08em] text-text-disabled hover:text-accent transition-colors disabled:opacity-50"
                      title="Delete"
                      aria-label="Delete expense"
                    >
                      [✕]
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
