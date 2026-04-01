'use client'

import { useState } from 'react'
import type { ProgrammePosition, Goal, Expense, FocusArea, FocusCheckin, Habit, HabitCompletion, DisciplineScore } from '@/types'
import { WorkoutTab } from './tabs/WorkoutTab'
import { OverviewTab } from './tabs/OverviewTab'
import { ExpensesTab } from './tabs/ExpensesTab'
import { GoalsTab } from './tabs/GoalsTab'
import { FocusTab } from './tabs/FocusTab'
import { DisciplineTab } from './tabs/DisciplineTab'

type Tab = 'overview' | 'expenses' | 'goals' | 'focus' | 'discipline' | 'workout'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'goals', label: 'Goals' },
  { id: 'focus', label: 'Focus' },
  { id: 'discipline', label: 'Discipline' },
  { id: 'workout', label: 'Workout' },
]

export interface JarvisDashboardProps {
  displayName: string | null
  position: ProgrammePosition
  todayDay: { id: string; name: string; emphasis: string | null } | null
  completedDows: number[]
  latestWeight: { weight_kg: number | null; date: string } | null
  targetWeightKg: number | null
  goals: Goal[]
  expenses: Expense[]
  focusAreas: FocusArea[]
  focusCheckins: FocusCheckin[]
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  disciplineScores: DisciplineScore[]
  today: string  // ISO date string 'YYYY-MM-DD'
}

export function JarvisDashboard(props: JarvisDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const {
    displayName, position, today,
    todayDay, completedDows, latestWeight, targetWeightKg,
    goals, expenses, focusAreas, focusCheckins,
    habits, habitCompletions, disciplineScores,
  } = props

  const monthName = new Date(today).toLocaleString('en-GB', { month: 'short' }).toUpperCase()
  const dayName = new Date(today).toLocaleString('en-GB', { weekday: 'short' }).toUpperCase()
  const dateDisplay = new Date(today).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).toUpperCase()

  return (
    <div className="min-h-full bg-[#050505]">
      {/* Header */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="font-mono text-sm font-bold tracking-[0.3em] uppercase text-green-400">
              JARVIS
            </h1>
            <p className="font-mono text-[10px] tracking-widest text-[#333] mt-0.5">
              {dayName} · {dateDisplay} · WEEK {position.weekNumber} OF 12
            </p>
          </div>
          {displayName && (
            <div className="size-7 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center font-mono text-[10px] text-green-400">
              {displayName[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 px-6 mt-4 border-b border-[#111]">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`font-mono text-[9px] tracking-widest uppercase pb-2 px-3 border-b-2 transition-colors ${
              activeTab === id
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-[#333] hover:text-[#666]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-6 py-5">
        {activeTab === 'overview' && (
          <OverviewTab
            position={position}
            today={today}
            todayDay={todayDay}
            completedDows={completedDows}
            goals={goals}
            expenses={expenses}
            focusAreas={focusAreas}
            focusCheckins={focusCheckins}
            habits={habits}
            habitCompletions={habitCompletions}
            disciplineScores={disciplineScores}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab expenses={expenses} today={today} />
        )}
        {activeTab === 'goals' && (
          <GoalsTab goals={goals} today={today} />
        )}
        {activeTab === 'focus' && (
          <FocusTab
            focusAreas={focusAreas}
            focusCheckins={focusCheckins}
            today={today}
          />
        )}
        {activeTab === 'discipline' && (
          <DisciplineTab
            habits={habits}
            habitCompletions={habitCompletions}
            disciplineScores={disciplineScores}
            today={today}
          />
        )}
        {activeTab === 'workout' && (
          <WorkoutTab
            position={position}
            todayDay={todayDay}
            completedDows={completedDows}
            latestWeight={latestWeight}
            targetWeightKg={targetWeightKg}
          />
        )}
      </div>
    </div>
  )
}
