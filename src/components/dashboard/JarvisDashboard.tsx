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
    <div className="min-h-full w-full">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-mono text-3xl font-bold tracking-[0.2em] uppercase text-text-primary leading-none mb-3">
              JARVIS
            </h1>
            <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary">
              {dayName} · {dateDisplay} · WEEK {position.weekNumber} OF 12
            </p>
          </div>
          {displayName && (
            <div className="size-10 border border-border-visible shrink-0 flex items-center justify-center font-mono text-[13px] uppercase text-text-primary">
              {displayName[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 px-6 mt-2 border-b border-border overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`font-mono text-[11px] tracking-[0.08em] uppercase pb-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-disabled hover:text-text-secondary'
            }`}
          >
            [ {label} ]
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
