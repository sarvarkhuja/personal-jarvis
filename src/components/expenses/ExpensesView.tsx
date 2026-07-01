'use client'

import { useRef, useState, useTransition, type ReactNode } from 'react'
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

const CATEGORY_EMOJI: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.emoji]),
)

const QUICK_AMOUNTS = [10_000, 25_000, 50_000, 100_000, 250_000]
const NUMBER_FORMAT = new Intl.NumberFormat('en-US')

/** Strip the trailing " so'm" so the unit can be set in Space Mono beside a Doto number. */
const numOnly = (s: string) => s.replace(/ so'm$/, '')

interface ExpensesViewProps {
  expenses: Expense[]
  today: string // 'YYYY-MM-DD'
}

export function ExpensesView({ expenses, today }: ExpensesViewProps) {
  // ── form / interaction state ──────────────────────────────────────────────
  const [isPending, startTransition] = useTransition()
  const [amountDigits, setAmountDigits] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('food')
  const [date, setDate] = useState(today)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // ── date math (SSR-stable, derived only from `today`) ─────────────────────
  const [year, month, dayOfMonth] = today.split('-').map(Number) // month = 1-12
  const daysInMonth = new Date(year, month, 0).getDate()
  const thisMonth = today.slice(0, 7)
  const prevMonthKey = `${month === 1 ? year - 1 : year}-${String(
    month === 1 ? 12 : month - 1,
  ).padStart(2, '0')}`

  const yesterday = (() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()

  // ── aggregates ────────────────────────────────────────────────────────────
  const monthlyTotals = aggregateExpensesByMonth(expenses)
  const thisMonthTotal = monthlyTotals[thisMonth] ?? 0
  const prevMonthTotal = monthlyTotals[prevMonthKey] ?? 0
  const delta = thisMonthTotal - prevMonthTotal

  const thisMonthExpenses = expenses
    .filter((e) => e.date.startsWith(thisMonth))
    .sort((a, b) => b.date.localeCompare(a.date))
  const txnCount = thisMonthExpenses.length

  const perDayTotals = new Array<number>(daysInMonth).fill(0)
  const perDayCounts = new Array<number>(daysInMonth).fill(0)
  for (const e of thisMonthExpenses) {
    const dayNum = Number(e.date.slice(8, 10))
    if (dayNum >= 1 && dayNum <= daysInMonth) {
      perDayTotals[dayNum - 1] += e.amount
      perDayCounts[dayNum - 1] += 1
    }
  }
  const maxDay = Math.max(...perDayTotals, 0)
  const busiestIdx = maxDay > 0 ? perDayTotals.indexOf(maxDay) : -1

  // ── burn / pacing ─────────────────────────────────────────────────────────
  const dailyBurn = txnCount ? thisMonthTotal / dayOfMonth : 0
  const avgPerTxn = txnCount ? thisMonthTotal / txnCount : 0
  // Where a steady, straight-line burn matched to last month would put us today.
  const paceTarget = prevMonthTotal * (dayOfMonth / daysInMonth)
  const isRunningHot = prevMonthTotal > 0 && thisMonthTotal > paceTarget

  // First past-day cell where cumulative spend overtakes the pace line → red run.
  let redStartIdx = -1
  if (isRunningHot) {
    let running = 0
    for (let i = 0; i < dayOfMonth; i++) {
      running += perDayTotals[i]
      if (running > paceTarget) {
        redStartIdx = i
        break
      }
    }
  }

  const verdict: { text: string; cls: string } = isRunningHot
    ? { text: 'RUNNING HOT', cls: 'text-accent' }
    : prevMonthTotal === 0
      ? { text: 'NO BASELINE', cls: 'text-text-secondary' }
      : thisMonthTotal < paceTarget * 0.97
        ? { text: 'UNDER', cls: 'text-success' }
        : { text: 'ON PACE', cls: 'text-text-secondary' }

  // ── labels ────────────────────────────────────────────────────────────────
  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    .toUpperCase()
  const busiestLabel =
    busiestIdx >= 0
      ? new Date(year, month - 1, busiestIdx + 1)
        .toLocaleString('en-GB', { weekday: 'short', day: '2-digit' })
        .toUpperCase()
      : '—'

  // ── 6-month trend (segmented, no recharts) ────────────────────────────────
  const monthKeys = lastNMonthKeys(6)
  const maxMonthly = Math.max(...monthKeys.map((k) => monthlyTotals[k] ?? 0), 1)
  const trend = monthKeys.map((k) => ({
    key: k,
    total: monthlyTotals[k] ?? 0,
    label: new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1)
      .toLocaleString('en-GB', { month: 'short' })
      .toUpperCase(),
    isCurrent: k === thisMonth,
  }))

  // ── category breakdown (monochrome) ───────────────────────────────────────
  const categoryRows = Object.entries(
    thisMonthExpenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  // ── form helpers ──────────────────────────────────────────────────────────
  const amountValue = amountDigits ? parseInt(amountDigits, 10) : 0
  const isFormValid = amountValue > 0 && Boolean(selectedCategory) && Boolean(date)

  function handleAmountChange(raw: string) {
    setAmountDigits(raw.replace(/[^\d]/g, '').slice(0, 12))
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

  // ── burn-strip cell appearance ────────────────────────────────────────────
  const cellBase =
    'flex-[1_0_0%] h-3 transition-colors duration-200 ease-out motion-reduce:transition-none'
  function cellFill(i: number): string {
    const dayNum = i + 1
    const total = perDayTotals[i]
    if (dayNum > dayOfMonth || total === 0) return 'border border-border bg-transparent'
    if (isRunningHot && redStartIdx >= 0 && i >= redStartIdx) return 'bg-accent'
    const ratio = maxDay > 0 ? total / maxDay : 0
    if (ratio > 0.85) return 'bg-warning'
    if (ratio > 0.5) return 'bg-warning/70'
    return 'bg-warning/40'
  }

  const tickPct = (dayOfMonth / daysInMonth) * 100
  const markerPct = Math.min(92, Math.max(8, tickPct))
  const markerShift = tickPct < 15 ? '0' : tickPct > 85 ? '-100%' : '-50%'

  const ann =
    hoveredDay !== null
      ? {
        date: new Date(year, month - 1, hoveredDay + 1)
          .toLocaleString('en-GB', { day: '2-digit', month: 'short' })
          .toUpperCase(),
        amount: perDayTotals[hoveredDay],
        count: perDayCounts[hoveredDay],
      }
      : null

  return (
    <div className="w-full space-y-4 px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full lg:w-1/3">
          {/* Log entry — add expense */}
          <Card title="[ LOG ENTRY ]">
            <form ref={formRef} action={handleSubmit} className="space-y-6">
              {/* Amount */}
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
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
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full border-b border-border-visible bg-transparent py-3 pr-16 font-mono text-3xl text-text-primary transition-colors placeholder:text-text-disabled focus:border-text-primary focus:outline-none"
                  />
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
                    so&apos;m
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setAmountDigits(String(value))}
                      className="rounded-full border border-border-visible px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary transition-colors hover:border-text-primary hover:text-text-primary"
                    >
                      +{formatUzsCompact(value)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                  Category
                </label>
                <input type="hidden" name="category" value={selectedCategory} />
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const isActive = selectedCategory === c.id
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        aria-pressed={isActive}
                        className={`flex flex-col items-center gap-1 rounded-lg border py-3 transition-colors ${isActive
                          ? 'border-text-primary bg-background text-text-primary'
                          : 'border-border text-text-secondary hover:border-border-visible hover:text-text-primary'
                          }`}
                      >
                        <span className="text-lg leading-none">{c.emoji}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
                          {c.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Note + date */}
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                    Note (optional)
                  </label>
                  <input
                    name="description"
                    type="text"
                    placeholder="e.g. Lunch with team"
                    className="w-full border-b border-border-visible bg-transparent py-2 font-mono text-[13px] text-text-primary transition-colors placeholder:text-text-disabled focus:border-text-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                    Date
                  </label>
                  <input
                    name="date"
                    type="date"
                    value={date}
                    required
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full appearance-none border-b border-border-visible bg-transparent py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-text-primary transition-colors focus:border-text-primary focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDate(today)}
                      className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${date === today
                        ? 'border-text-primary text-text-primary'
                        : 'border-border-visible text-text-secondary hover:text-text-primary'
                        }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setDate(yesterday)}
                      className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${date === yesterday
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
                className="h-12 w-full rounded-full bg-text-display font-mono text-[13px] uppercase tracking-[0.06em] text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending
                  ? '[ ADDING ]'
                  : amountValue > 0
                    ? `Add ${formatUzs(amountValue)}`
                    : 'Enter an amount'}
              </button>
            </form>
          </Card></div>
        <div className="w-full lg:w-2/3">
          {/* ── BURN INSTRUMENT — full-width signature card ──────────────────── */}
          <section className="rounded-lg border border-border bg-surface p-6 md:p-8">
            {/* Header rail: orient + verdict */}
            <div className="mb-8 flex items-baseline justify-between gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                [ {monthLabel} · DAY {dayOfMonth} OF {daysInMonth} ]
              </span>
              <span className={`font-mono text-[11px] uppercase tracking-[0.08em] ${verdict.cls}`}>
                <span className="sr-only">Pace status: </span>
                {verdict.text}
              </span>
            </div>

            {/* Burn-rate hero number (the only Doto on the page) */}
            <div className="mb-4 flex items-baseline">
              <span className="font-doto text-5xl font-bold leading-none tracking-tight text-warning md:text-[56px]">
                {numOnly(formatUzsCompact(dailyBurn))}
              </span>
              <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
                so&apos;m / DAY
              </span>
            </div>

            {/* THE BURN STRIP — one cell per day; pace tick on today */}
            <div className="relative mb-2">
              <div className="flex h-5 w-full items-center gap-[2px]">
                {perDayTotals.map((_, i) => {
                  const dayNum = i + 1
                  const total = perDayTotals[i]
                  const interactive = dayNum <= dayOfMonth && total > 0
                  if (!interactive) {
                    return <div key={i} aria-hidden className={`${cellBase} ${cellFill(i)}`} />
                  }
                  const labelDate = new Date(year, month - 1, dayNum).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                  })
                  return (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHoveredDay(i)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onFocus={() => setHoveredDay(i)}
                      onBlur={() => setHoveredDay(null)}
                      aria-label={`${labelDate}: ${formatUzs(total)}, ${perDayCounts[i]} ${perDayCounts[i] === 1 ? 'item' : 'items'
                        }`}
                      aria-describedby="burn-strip-annotation"
                      className={`${cellBase} ${cellFill(
                        i,
                      )} cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary`}
                    />
                  )
                })}
              </div>
              {/* pace tick — the fair-share needle at today */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 top-0 w-[2px] bg-text-secondary"
                style={{ left: `${tickPct}%` }}
              />
            </div>

            {/* strip markers */}
            <div className="relative mb-3 h-4">
              <span className="absolute left-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                01
              </span>
              <span
                className="absolute whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled"
                style={{ left: `${markerPct}%`, transform: `translateX(${markerShift})` }}
              >
                {isRunningHot && <span className="text-accent">● </span>}
                TODAY · DAY {dayOfMonth}/{daysInMonth}
              </span>
              <span className="absolute right-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                {daysInMonth}
              </span>
            </div>

            {/* hover/focus annotation (height reserved → no layout shift) */}
            <div
              id="burn-strip-annotation"
              role="status"
              aria-live="polite"
              className="mb-4 h-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary"
            >
              {ann && (
                <>
                  {ann.date} · <span className="text-warning">{formatUzsCompact(ann.amount)}</span> ·{' '}
                  {ann.count} {ann.count === 1 ? 'ITEM' : 'ITEMS'}
                </>
              )}
            </div>

            {/* the one human sentence (the only Space Grotesk on the page) */}
            <p className="font-sans text-[15px] leading-snug text-text-secondary">
              {txnCount === 0 ? (
                'Nothing logged yet. Add your first expense below.'
              ) : (
                <>
                  <span className="font-mono text-warning">{formatUzsCompact(thisMonthTotal)}</span>{' '}
                  spent so far · burning{' '}
                  <span className="font-mono text-warning">{formatUzsCompact(dailyBurn)}</span> a day.
                  {prevMonthTotal === 0 && ' No baseline yet — tracking this month.'}
                </>
              )}
            </p>
          </section>

          {/* ── Masonry of widget cards ──────────────────────────────────────── */}
          <div className="gap-4 lg:columns-2 mt-4">


            {/* This month — derived stats */}
            <Card title="[ THIS MONTH ]">
              <div className="grid grid-cols-2 gap-6">
                <Stat label="SPENT SO FAR" value={formatUzs(thisMonthTotal)} valueClassName="text-warning" />
                <Stat
                  label="BUSIEST DAY"
                  value={busiestIdx >= 0 ? `${busiestLabel} — ${formatUzsCompact(maxDay)}` : '—'}
                  valueClassName="text-text-primary"
                />
                <Stat
                  label="AVG / TXN"
                  value={txnCount ? formatUzsCompact(avgPerTxn) : '—'}
                  valueClassName="text-text-primary"
                />
                <Stat
                  label="VS LAST MONTH"
                  value={
                    prevMonthTotal === 0
                      ? '—'
                      : delta === 0
                        ? formatUzsCompact(0)
                        : `${delta > 0 ? '+' : '-'}${formatUzsCompact(Math.abs(delta))}`
                  }
                  // Green only when down vs last month — but never alongside the running-hot
                  // red, so the page keeps a single expressive colour moment.
                  valueClassName={
                    delta < 0 && prevMonthTotal > 0 && !isRunningHot
                      ? 'text-success'
                      : 'text-text-primary'
                  }
                />
              </div>
            </Card>

            {/* 6-month trend (segmented) */}
            <Card title="[ 6-MONTH TREND ]">
              <div className="flex h-12 items-end gap-2">
                {trend.map((t) => (
                  <div key={t.key} className="flex h-full flex-1 items-end">
                    <div
                      className={`w-full ${t.isCurrent ? 'bg-warning' : 'bg-border'}`}
                      style={{ height: `${Math.max(4, (t.total / maxMonthly) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                {trend.map((t) => (
                  <div
                    key={t.key}
                    className="flex-1 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled"
                  >
                    {t.label}
                  </div>
                ))}
              </div>
            </Card>

            {/* Where it goes — category bars (strictly monochrome) */}
            {categoryRows.length > 0 && (
              <Card title="[ WHERE IT GOES ]">
                <div className="space-y-4">
                  {categoryRows.map(([cat, amount]) => {
                    const pct = thisMonthTotal > 0 ? (amount / thisMonthTotal) * 100 : 0
                    return (
                      <div key={cat}>
                        <div className="mb-2 flex justify-between">
                          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                            {CATEGORY_EMOJI[cat] ?? '✦'} {cat}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums tracking-[0.04em] text-text-primary">
                            {formatUzsCompact(amount)}
                          </span>
                        </div>
                        <div className="flex h-[6px] gap-[2px]">
                          {Array.from({ length: 25 }).map((_, i) => (
                            <div
                              key={i}
                              className={`flex-[1_0_0%] ${i < pct / 4 ? 'bg-text-primary' : 'bg-border'}`}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* This month's log — transactions */}
            <Card title={`[ LOG · ${txnCount} ]`}>
              {txnCount === 0 ? (
                <p className="py-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
                  No expenses yet this month — add your first one above.
                </p>
              ) : (
                <div>
                  {thisMonthExpenses.map((expense, idx, arr) => (
                    <div
                      key={expense.id}
                      className={`flex items-center justify-between py-4 ${idx === arr.length - 1 ? '' : 'border-b border-border'
                        }`}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="shrink-0 text-base" aria-hidden>
                          {CATEGORY_EMOJI[expense.category] ?? '✦'}
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-mono text-[12px] tracking-[0.04em] text-text-primary">
                            {expense.description || expense.category.toUpperCase()}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                            {new Date(expense.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                            })}{' '}
                            · {expense.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="font-mono text-[12px] tabular-nums tracking-[0.04em] text-warning">
                          {formatUzs(expense.amount)}
                        </span>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={isPending}
                          className="font-mono text-[11px] tracking-[0.08em] text-text-disabled transition-colors hover:text-accent disabled:opacity-50"
                          title="Delete"
                          aria-label="Delete expense"
                        >
                          [✕]
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div></div>
      </div>

    </div>
  )
}

/** Masonry widget card — kept whole within a CSS column. */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6">
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
        {title}
      </div>
      {children}
    </section>
  )
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName: string
}) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
        {label}
      </div>
      <div className={`font-mono text-[13px] tabular-nums tracking-[0.04em] ${valueClassName}`}>
        {value}
      </div>
    </div>
  )
}
