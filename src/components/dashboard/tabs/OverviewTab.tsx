'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { ProgrammePosition, Goal, Expense, FocusArea, FocusCheckin, Habit, HabitCompletion, DisciplineScore } from '@/types'
import { calcOverallFocusStreak, calcHabitStreak, aggregateExpensesByMonth, lastNMonthKeys, formatPence } from '@/lib/utils/dashboard-utils'

const NEXT_TRAINING_DAY: Record<number, string> = {
  0: 'Monday', 1: 'Tuesday', 2: 'Thursday', 3: 'Thursday',
  4: 'Friday', 5: 'Monday', 6: 'Monday',
}

interface OverviewTabProps {
  position: ProgrammePosition
  today: string
  todayDay: { id: string; name: string; emphasis: string | null } | null
  completedDows: number[]
  goals: Goal[]
  expenses: Expense[]
  focusAreas: FocusArea[]
  focusCheckins: FocusCheckin[]
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  disciplineScores: DisciplineScore[]
}

export function OverviewTab({
  position, today, todayDay, completedDows,
  goals, expenses, focusAreas, focusCheckins,
  habits, habitCompletions, disciplineScores,
}: OverviewTabProps) {
  // --- Computed stats ---
  const allCheckinDates = focusCheckins.map(c => c.date)
  const focusStreak = calcOverallFocusStreak(allCheckinDates, today)

  const activeGoals = goals.filter(g => g.status === 'active')

  const thisMonth = today.slice(0, 7)
  const monthExpenses = expenses.filter(e => e.date.startsWith(thisMonth))
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount_pence, 0)

  const last7Scores = disciplineScores.slice(0, 7).map(s => s.score)
  const avgScoreNum = last7Scores.length
    ? (last7Scores.reduce((a, b) => a + b, 0) / last7Scores.length)
    : 0
  const avgScore = last7Scores.length ? avgScoreNum.toFixed(1) : '—'

  // Mini 6-month chart data
  const monthKeys = lastNMonthKeys(6)
  const monthlyTotals = aggregateExpensesByMonth(expenses)
  const maxMonthly = Math.max(...monthKeys.map(k => monthlyTotals[k] ?? 0), 1)

  // Today's checkins
  const todayCheckinAreaIds = new Set(
    focusCheckins.filter(c => c.date === today).map(c => c.focus_area_id)
  )
  // Today's habit completions
  const todayCompletedHabitIds = new Set(
    habitCompletions.filter(c => c.date === today).map(c => c.habit_id)
  )

  const CATEGORY_COLORS: Record<string, string> = {
    food: 'var(--warning)', transport: 'var(--interactive)', shopping: 'var(--text-primary)',
    entertainment: 'var(--accent)', health: 'var(--success)', other: 'var(--text-disabled)',
  }

  const categoryTotals = monthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_pence
    return acc
  }, {})
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="space-y-8 max-w-4xl w-full">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Focus Streak" value={`${focusStreak}`} unit="d" status="success" />
        <StatCard label="Goals" value={`${activeGoals.length}`} unit={`/ ${goals.length}`} status="primary" />
        <StatCard
          label={`${new Date(today).toLocaleString('en-GB', { month: 'short' })} Spend`}
          value={formatPence(monthTotal).replace('.00', '')}
          status="warning"
        />
        <StatCard 
          label="Discipline" 
          value={avgScore} 
          unit="/10" 
          status={avgScoreNum >= 8 ? 'success' : avgScoreNum >= 5 ? 'warning' : 'accent'} 
        />
      </div>

      {/* Today + Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's workout */}
        <div className="bg-surface border border-border rounded-lg p-6 flex flex-col justify-between">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-8">[ TODAY · WORKOUT ]</div>
          {position.isTrainingDay && todayDay ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-none bg-success" />
                <span className="font-mono text-sm font-bold text-success uppercase tracking-wider">{todayDay.name}</span>
              </div>
              {todayDay.emphasis && (
                <p className="font-sans text-[16px] text-text-primary mb-6">{todayDay.emphasis}</p>
              )}
              <Link href="/workout" className="block w-full">
                <button className="w-full bg-text-display text-background font-mono text-[13px] tracking-[0.06em] uppercase h-11 rounded-full hover:opacity-90 transition-opacity">
                  START WORKOUT
                </button>
              </Link>
            </div>
          ) : (
            <div>
              <span className="font-mono text-sm text-text-disabled uppercase">Rest Day</span>
              <p className="font-mono text-[11px] tracking-[0.08em] text-text-secondary uppercase mt-2">
                Next: {NEXT_TRAINING_DAY[position.dayOfWeek]}
              </p>
            </div>
          )}
        </div>

        {/* Active goals top 3 */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ ACTIVE GOALS ]</div>
          {activeGoals.length === 0 ? (
            <p className="font-mono text-sm text-text-disabled uppercase">No active goals</p>
          ) : (
            <div className="space-y-6">
              {activeGoals.slice(0, 3).map(goal => {
                const pct = goal.target_value
                  ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                  : 0
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between mb-2">
                      <span className="font-mono text-[11px] tracking-[0.08em] text-text-secondary uppercase truncate pr-2">{goal.title}</span>
                      <span className="font-mono text-[11px] tracking-[0.08em] text-text-primary shrink-0">{pct}%</span>
                    </div>
                    {/* Segmented Progress Bar */}
                    <div className="flex gap-[2px] h-[6px]">
                      {Array.from({ length: 25 }).map((_, i) => {
                        const isFilled = i < pct / 4;
                        return (
                          <div
                            key={i}
                            className={`flex-[1_0_0%] ${isFilled ? 'bg-text-display' : 'bg-border'}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Focus + Habits + Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Focus areas */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ FOCUS AREAS ]</div>
          {focusAreas.length === 0 ? (
            <p className="font-mono text-sm text-text-disabled uppercase">None yet</p>
          ) : (
            <div className="space-y-0">
              {focusAreas.filter(a => a.is_active).map((area, idx, arr) => {
                const areaCheckins = focusCheckins
                  .filter(c => c.focus_area_id === area.id)
                  .map(c => c.date)
                const streak = calcHabitStreak(areaCheckins, today)
                const checkedToday = todayCheckinAreaIds.has(area.id)
                const isLast = idx === arr.length - 1
                return (
                  <div key={area.id} className={`flex items-center justify-between py-3 ${!isLast ? 'border-b border-border' : ''}`}>
                    <span className="font-mono text-[11px] tracking-[0.08em] text-text-secondary uppercase">{area.emoji} {area.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] tracking-[0.08em] text-interactive">{streak}d</span>
                      <div className={`w-[32px] h-[20px] rounded-full border border-border-visible p-[2px] flex ${checkedToday ? 'bg-text-display' : 'bg-transparent'}`}>
                        <div className={`w-[14px] h-[14px] rounded-full transition-transform ${checkedToday ? 'translate-x-[12px] bg-background' : 'bg-text-disabled'}`} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Habits */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ HABITS · TODAY ]</div>
          {habits.length === 0 ? (
            <p className="font-mono text-sm text-text-disabled uppercase">None yet</p>
          ) : (
            <div className="space-y-0">
              {habits.filter(h => h.is_active).map((habit, idx, arr) => {
                const completions = habitCompletions
                  .filter(c => c.habit_id === habit.id)
                  .map(c => c.date)
                const streak = calcHabitStreak(completions, today)
                const doneToday = todayCompletedHabitIds.has(habit.id)
                const isLast = idx === arr.length - 1
                return (
                  <div key={habit.id} className={`flex items-center justify-between py-3 ${!isLast ? 'border-b border-border' : ''}`}>
                    <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary">{habit.emoji} {habit.name}</span>
                    <div className="flex items-center gap-3">
                      {streak > 0 && (
                        <span className="font-mono text-[11px] tracking-[0.08em] text-warning">{streak}d</span>
                      )}
                      <div className={`w-[32px] h-[20px] rounded-full border border-border-visible p-[2px] flex ${doneToday ? 'bg-text-display' : 'bg-transparent'}`}>
                        <div className={`w-[14px] h-[14px] rounded-full transition-transform ${doneToday ? 'translate-x-[12px] bg-background' : 'bg-text-disabled'}`} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expenses mini */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">
            [ SPEND · {new Date(today).toLocaleString('en-GB', { month: 'short' }).toUpperCase()} ]
          </div>
          {/* Square ended bar chart */}
          <div className="flex gap-1 items-end h-12 mb-6">
            {monthKeys.map(key => {
              const total = monthlyTotals[key] ?? 0
              const heightPct = Math.max(4, (total / maxMonthly) * 100)
              const isCurrent = key === thisMonth
              return (
                <div
                  key={key}
                  className={`flex-1 rounded-none ${
                    isCurrent ? 'bg-warning' : 'bg-border'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              )
            })}
          </div>
          <div className="space-y-0">
            {topCategories.map(([cat, pence], idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <div key={cat} className={`flex justify-between py-2 ${!isLast ? 'border-b border-border' : ''}`}>
                  <span className="font-mono text-[11px] tracking-[0.08em] uppercase" style={{ color: CATEGORY_COLORS[cat] ?? 'var(--text-disabled)' }}>
                    {cat}
                  </span>
                  <span className="font-mono text-[11px] text-text-primary">{formatPence(pence)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, unit, status
}: {
  label: string; value: string; unit?: string; status?: 'success' | 'warning' | 'error' | 'neutral' | 'accent' | 'primary' | 'display'
}) {
  const colorClass = status === 'success' ? 'text-success' :
                     status === 'warning' ? 'text-warning' :
                     status === 'error' || status === 'accent' ? 'text-accent' :
                     status === 'primary' ? 'text-primary' : 'text-display';

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-4">{label}</div>
      <div className={`font-doto text-4xl leading-none tracking-tight ${colorClass}`}>
        {value}
        {unit && <span className="font-mono text-[11px] tracking-[0.08em] font-normal text-text-secondary ml-2 uppercase absolute mt-1">{unit}</span>}
      </div>
    </div>
  )
}
