'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Goal, Habit, HabitCompletion, DisciplineScore } from '@/types'
import { addHabit, toggleHabitCompletion } from '@/actions/discipline'
import { calcHabitStreak } from '@/lib/utils/dashboard-utils'

interface DisciplineTabProps {
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  disciplineScores: DisciplineScore[]
  goals: Goal[]
  today: string
}

function last7DayKeys(today: string): string[] {
  const keys: string[] = []
  const d = new Date(today)
  for (let i = 6; i >= 0; i--) {
    const day = new Date(d)
    day.setDate(d.getDate() - i)
    keys.push(day.toISOString().split('T')[0])
  }
  return keys
}

function last30DayKeys(today: string): string[] {
  const keys: string[] = []
  const d = new Date(today)
  for (let i = 29; i >= 0; i--) {
    const day = new Date(d)
    day.setDate(d.getDate() - i)
    keys.push(day.toISOString().split('T')[0])
  }
  return keys
}

export function DisciplineTab({ habits, habitCompletions, disciplineScores, goals, today }: DisciplineTabProps) {
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const activeGoals = goals.filter(g => g.status === 'active')

  const last7Days = last7DayKeys(today)
  const last30Days = last30DayKeys(today)

  const todayCompletedHabitIds = new Set(
    habitCompletions.filter(c => c.date === today).map(c => c.habit_id)
  )

  const scoreMap = new Map(disciplineScores.map(s => [s.date, s.score]))
  const chartData = last30Days.map(day => ({
    day: new Date(day).getDate().toString().padStart(2, '0'),
    tick: day.slice(8, 10), // the day number
    score: scoreMap.get(day) ?? null,
  }))

  function handleToggleHabit(habitId: string) {
    startTransition(() => { toggleHabitCompletion(habitId, today) })
  }

  function handleAddHabit(formData: FormData) {
    setFormError(null)
    startTransition(async () => {
      const result = await addHabit(formData)
      if (result?.error) setFormError(result.error)
    })
  }

  return (
    <div className="space-y-8 max-w-2xl w-full">
      {/* Habits checklist */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ TODAY&apos;S HABITS ]</div>
        {habits.filter(h => h.is_active).length === 0 ? (
          <p className="font-mono text-sm text-text-disabled uppercase">None yet</p>
        ) : (
          <div className="space-y-0">
            {habits.filter(h => h.is_active).map((habit, idx, arr) => {
              const completions = habitCompletions
                .filter(c => c.habit_id === habit.id)
                .map(c => c.date)
              const streak = calcHabitStreak(completions, today)
              const doneToday = todayCompletedHabitIds.has(habit.id)
              const completionSet = new Set(completions)
              const isLast = idx === arr.length - 1

              return (
                <div key={habit.id} className={`py-4 ${!isLast ? 'border-b border-border' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleHabit(habit.id)}
                        disabled={isPending}
                        className={`w-[44px] h-[24px] rounded-full border border-border-visible p-[2px] flex shrink-0 ${doneToday ? 'bg-text-display' : 'bg-transparent'}`}
                      >
                        <div className={`w-[18px] h-[18px] rounded-full transition-transform ${doneToday ? 'translate-x-[20px] bg-background' : 'bg-text-disabled'}`} />
                      </button>
                      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-primary">{habit.emoji} {habit.name}</span>
                    </div>
                    {streak > 0 && (
                      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-warning">{streak}d</span>
                    )}
                  </div>
                  {/* 7-day trailing blocks */}
                  <div className="flex gap-1 ml-[60px]">
                    {last7Days.map(day => {
                      const done = completionSet.has(day)
                      const isToday = day === today
                      const label = new Date(day).toLocaleString('en-GB', { weekday: 'narrow' }).toUpperCase()
                      return (
                        <div key={day} className="flex flex-col items-center gap-1">
                          <div className={`w-6 h-6 rounded-none border border-border-visible flex items-center justify-center ${
                            done
                              ? 'bg-text-display border-text-display text-background'
                              : isToday
                                ? 'bg-surface border-text-secondary text-text-primary'
                                : 'bg-transparent text-text-disabled'
                          }`}>
                            <span className="font-doto text-[10px] leading-none">{done ? '·' : ''}</span>
                          </div>
                          <span className={`font-mono text-[9px] uppercase ${isToday ? 'text-text-primary' : 'text-text-disabled'}`}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 30-day score trend */}
      {disciplineScores.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-8">[ 30-DAY SCORE TREND ]</div>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis
                  dataKey="tick"
                  tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--text-disabled)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis domain={[0, 10]} hide />
                <Tooltip
                  cursor={{ stroke: 'var(--border-visible)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length || payload[0].value == null) return null
                    return (
                      <div className="bg-background border border-border-visible px-3 py-2 font-mono text-[11px] tracking-[0.08em] text-text-display uppercase">
                        {payload[0].value} / 10
                      </div>
                    )
                  }}
                />
                <ReferenceLine y={7} stroke="var(--border-visible)" strokeDasharray="2 2" />
                <Line
                  type="stepAfter"
                  dataKey="score"
                  stroke="var(--text-display)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Add habit */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ ADD HABIT ]</div>
        {activeGoals.length === 0 ? (
          <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary">
            Habits belong to a goal.{' '}
            <Link href="/goals" className="underline hover:text-text-primary">
              Create a goal first
            </Link>
            .
          </p>
        ) : (
          <form action={handleAddHabit} className="flex flex-col gap-3">
            <div className="flex gap-4">
              <input
                name="emoji"
                type="text"
                placeholder="XX"
                maxLength={2}
                className="w-12 bg-transparent border-b border-border-visible py-2 font-mono text-[13px] text-center text-text-primary focus:outline-none focus:border-text-primary transition-colors placeholder:text-text-disabled"
              />
              <input
                name="name"
                type="text"
                placeholder="HABIT NAME"
                required
                className="flex-1 bg-transparent border-b border-border-visible py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors"
              />
            </div>
            <div className="flex gap-4">
              <select
                name="goal_id"
                required
                defaultValue=""
                className="flex-1 bg-transparent border-b border-border-visible py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-text-primary focus:outline-none focus:border-text-primary transition-colors"
              >
                <option value="" disabled>SELECT GOAL</option>
                {activeGoals.map(g => (
                  <option key={g.id} value={g.id}>{g.title.toUpperCase()}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isPending}
                className="font-mono text-[11px] tracking-[0.08em] uppercase bg-transparent border border-border-visible text-text-primary px-6 py-2 hover:border-text-primary transition-colors disabled:opacity-50"
              >
                + ADD
              </button>
            </div>
            {formError && (
              <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-warning">{formError}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
