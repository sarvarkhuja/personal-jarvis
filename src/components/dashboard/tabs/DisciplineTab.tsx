'use client'

import { useState, useTransition } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Button } from '@/components/ui/button'
import type { Habit, HabitCompletion, DisciplineScore } from '@/types'
import { addHabit, toggleHabitCompletion, saveDisciplineScore } from '@/actions/discipline'
import { calcHabitStreak } from '@/lib/utils/dashboard-utils'

interface DisciplineTabProps {
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  disciplineScores: DisciplineScore[]
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

export function DisciplineTab({ habits, habitCompletions, disciplineScores, today }: DisciplineTabProps) {
  const [isPending, startTransition] = useTransition()
  const [scoreInput, setScoreInput] = useState<number>(
    disciplineScores.find(s => s.date === today)?.score ?? 7
  )

  const last7Days = last7DayKeys(today)
  const last30Days = last30DayKeys(today)

  const todayCompletedHabitIds = new Set(
    habitCompletions.filter(c => c.date === today).map(c => c.habit_id)
  )
  const todayScore = disciplineScores.find(s => s.date === today)

  const scoreMap = new Map(disciplineScores.map(s => [s.date, s.score]))
  const chartData = last30Days.map(day => ({
    day: new Date(day).getDate().toString(),
    score: scoreMap.get(day) ?? null,
  }))

  function handleToggleHabit(habitId: string) {
    startTransition(() => { toggleHabitCompletion(habitId, today) })
  }

  function handleSaveScore() {
    startTransition(() => { saveDisciplineScore(today, scoreInput) })
  }

  function handleAddHabit(formData: FormData) {
    startTransition(() => { addHabit(formData) })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Habits checklist */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Today's Habits</div>
        {habits.filter(h => h.is_active).length === 0 ? (
          <p className="font-mono text-xs text-[#333]">No habits yet.</p>
        ) : (
          <div className="space-y-0">
            {habits.filter(h => h.is_active).map(habit => {
              const completions = habitCompletions
                .filter(c => c.habit_id === habit.id)
                .map(c => c.date)
              const streak = calcHabitStreak(completions, today)
              const doneToday = todayCompletedHabitIds.has(habit.id)
              const completionSet = new Set(completions)

              return (
                <div key={habit.id} className="py-2.5 border-b border-[#0d0d0d] last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleHabit(habit.id)}
                        disabled={isPending}
                        className={`size-5 rounded border flex items-center justify-center text-[10px] transition-all ${
                          doneToday
                            ? 'bg-pink-500/10 border-pink-500/40 text-pink-400'
                            : 'bg-[#111] border-[#222] text-[#333] hover:border-pink-500/30'
                        }`}
                      >
                        {doneToday ? '✓' : ''}
                      </button>
                      <span className="font-mono text-xs text-[#888]">{habit.emoji} {habit.name}</span>
                    </div>
                    {streak > 0 && (
                      <span className="font-mono text-[10px] text-amber-400">🔥 {streak}d</span>
                    )}
                  </div>
                  {/* 7-day dot grid */}
                  <div className="flex gap-[3px] ml-7">
                    {last7Days.map(day => {
                      const done = completionSet.has(day)
                      const isToday = day === today
                      const label = new Date(day).toLocaleString('en-GB', { weekday: 'narrow' })
                      return (
                        <div key={day} className="flex flex-col items-center gap-0.5">
                          <div className={`w-5 h-5 rounded-[3px] flex items-center justify-center text-[7px] ${
                            done
                              ? 'bg-pink-500/20 border border-pink-500/40 text-pink-400'
                              : isToday
                                ? 'bg-[#111] border border-pink-500/20 text-[#333]'
                                : 'bg-[#0d0d0d] border border-[#111] text-[#222]'
                          }`}>
                            {done ? '✓' : ''}
                          </div>
                          <span className={`font-mono text-[7px] ${isToday ? 'text-pink-400' : 'text-[#333]'}`}>
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

      {/* Daily score */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444]">Today's Score</div>
          {todayScore && (
            <span className="font-mono text-xs text-pink-400">{todayScore.score}/10 saved</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={10}
            value={scoreInput}
            onChange={e => setScoreInput(Number(e.target.value))}
            className="flex-1 accent-pink-500"
          />
          <span className="font-mono text-2xl font-bold text-pink-400 w-8">{scoreInput}</span>
          <Button
            onClick={handleSaveScore}
            disabled={isPending}
            size="sm"
            variant="outline"
            className="font-mono text-[10px] tracking-widest border-pink-500/30 text-pink-400 hover:bg-pink-500/10 shrink-0"
          >
            {isPending ? '...' : 'SAVE'}
          </Button>
        </div>
      </div>

      {/* 30-day score trend */}
      {disciplineScores.length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">30-Day Score Trend</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 8, fontFamily: 'var(--font-geist-mono)', fill: '#333' }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis domain={[0, 10]} hide />
              <Tooltip
                cursor={{ stroke: '#333' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || payload[0].value == null) return null
                  return (
                    <div className="bg-[#111] border border-[#222] rounded px-2 py-1 font-mono text-[10px] text-pink-400">
                      {payload[0].value}/10
                    </div>
                  )
                }}
              />
              <ReferenceLine y={7} stroke="#333" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#ec4899"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add habit */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Add Habit</div>
        <form action={handleAddHabit} className="flex gap-2">
          <input
            name="emoji"
            type="text"
            placeholder="✅"
            maxLength={2}
            className="w-12 bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-sm text-center text-[#aaa] focus:outline-none focus:border-pink-500/50"
          />
          <input
            name="name"
            type="text"
            placeholder="Habit name"
            required
            className="flex-1 bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-pink-500/50"
          />
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            variant="outline"
            className="font-mono text-[10px] tracking-widest border-pink-500/30 text-pink-400 hover:bg-pink-500/10 shrink-0"
          >
            + ADD
          </Button>
        </form>
      </div>
    </div>
  )
}
