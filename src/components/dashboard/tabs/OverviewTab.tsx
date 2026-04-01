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
  const avgScore = last7Scores.length
    ? (last7Scores.reduce((a, b) => a + b, 0) / last7Scores.length).toFixed(1)
    : '—'

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
    food: '#f59e0b', transport: '#06b6d4', shopping: '#a855f7',
    entertainment: '#ec4899', health: '#22c55e', other: '#6b7280',
  }

  const categoryTotals = monthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_pence
    return acc
  }, {})
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Focus Streak" value={`${focusStreak}`} unit="d" color="text-green-400" borderColor="border-green-500/20" />
        <StatCard label="Goals" value={`${activeGoals.length}`} unit={`/ ${goals.length}`} color="text-indigo-400" borderColor="border-indigo-500/20" />
        <StatCard
          label={`${new Date(today).toLocaleString('en-GB', { month: 'short' })} Spend`}
          value={formatPence(monthTotal).replace('.00', '')}
          color="text-amber-400"
          borderColor="border-amber-500/20"
        />
        <StatCard label="Discipline" value={avgScore} unit="/10" color="text-pink-400" borderColor="border-pink-500/20" />
      </div>

      {/* Today + Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Today's workout */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-2">Today · Workout</div>
          {position.isTrainingDay && todayDay ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-sm font-semibold text-green-400">{todayDay.name}</span>
              </div>
              {todayDay.emphasis && (
                <p className="font-mono text-xs text-[#555] mb-3">{todayDay.emphasis}</p>
              )}
              <Link href="/workout">
                <Button size="sm" className="w-full font-mono text-[10px] tracking-widest">
                  START WORKOUT
                </Button>
              </Link>
            </>
          ) : (
            <>
              <span className="font-mono text-sm text-[#444]">Rest Day</span>
              <p className="font-mono text-xs text-[#333] mt-1">
                Next: {NEXT_TRAINING_DAY[position.dayOfWeek]}
              </p>
            </>
          )}
        </div>

        {/* Active goals top 3 */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Active Goals</div>
          {activeGoals.length === 0 ? (
            <p className="font-mono text-xs text-[#333]">No active goals</p>
          ) : (
            <div className="space-y-3">
              {activeGoals.slice(0, 3).map(goal => {
                const pct = goal.target_value
                  ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                  : 0
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-[#888] truncate pr-2">{goal.title}</span>
                      <span className="font-mono text-[10px] text-[#444] shrink-0">{pct}%</span>
                    </div>
                    <div className="h-[3px] bg-[#111] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Focus + Habits + Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Focus areas */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Focus Areas</div>
          {focusAreas.length === 0 ? (
            <p className="font-mono text-xs text-[#333]">None yet</p>
          ) : (
            <div className="space-y-2">
              {focusAreas.filter(a => a.is_active).map(area => {
                const areaCheckins = focusCheckins
                  .filter(c => c.focus_area_id === area.id)
                  .map(c => c.date)
                const streak = calcHabitStreak(areaCheckins, today)
                const checkedToday = todayCheckinAreaIds.has(area.id)
                return (
                  <div key={area.id} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#888]">{area.emoji} {area.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-cyan-400">{streak}d</span>
                      <div className={`size-4 rounded-sm flex items-center justify-center text-[8px] ${
                        checkedToday
                          ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                          : 'bg-[#111] border border-[#222] text-[#333]'
                      }`}>
                        {checkedToday ? '✓' : '○'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Habits */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Habits · Today</div>
          {habits.length === 0 ? (
            <p className="font-mono text-xs text-[#333]">None yet</p>
          ) : (
            <div className="space-y-2">
              {habits.filter(h => h.is_active).map(habit => {
                const completions = habitCompletions
                  .filter(c => c.habit_id === habit.id)
                  .map(c => c.date)
                const streak = calcHabitStreak(completions, today)
                const doneToday = todayCompletedHabitIds.has(habit.id)
                return (
                  <div key={habit.id} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#888]">{habit.emoji} {habit.name}</span>
                    <div className="flex items-center gap-2">
                      {streak > 0 && (
                        <span className="font-mono text-[9px] text-amber-400">🔥{streak}</span>
                      )}
                      <div className={`size-4 rounded-sm flex items-center justify-center text-[8px] ${
                        doneToday
                          ? 'bg-pink-500/10 border border-pink-500/30 text-pink-400'
                          : 'bg-[#111] border border-[#222] text-[#333]'
                      }`}>
                        {doneToday ? '✓' : '○'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expenses mini */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">
            Spend · {new Date(today).toLocaleString('en-GB', { month: 'short' })}
          </div>
          {/* Mini bar chart */}
          <div className="flex gap-1 items-end h-8 mb-2">
            {monthKeys.map(key => {
              const total = monthlyTotals[key] ?? 0
              const heightPct = Math.max(4, (total / maxMonthly) * 100)
              const isCurrent = key === thisMonth
              return (
                <div
                  key={key}
                  className={`flex-1 rounded-t-[2px] ${
                    isCurrent ? 'bg-amber-500/40 border border-amber-500/40' : 'bg-[#1a1a1a]'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              )
            })}
          </div>
          <div className="space-y-1">
            {topCategories.map(([cat, pence]) => (
              <div key={cat} className="flex justify-between">
                <span className="font-mono text-[9px] capitalize" style={{ color: CATEGORY_COLORS[cat] ?? '#6b7280' }}>
                  {cat}
                </span>
                <span className="font-mono text-[9px] text-amber-400">{formatPence(pence)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, unit, color, borderColor,
}: {
  label: string; value: string; unit?: string; color: string; borderColor: string
}) {
  return (
    <div className={`bg-[#0a0a0a] border rounded-md p-4 ${borderColor}`}>
      <div className="font-mono text-[8px] tracking-widest uppercase text-[#444] mb-2">{label}</div>
      <div className={`font-mono text-2xl font-bold leading-none ${color}`}>
        {value}
        {unit && <span className="text-xs font-normal text-[#333] ml-1">{unit}</span>}
      </div>
    </div>
  )
}
