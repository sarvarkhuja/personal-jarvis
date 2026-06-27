'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Goal, Expense, FocusArea, FocusCheckin, Habit, HabitCompletion, DisciplineScore } from '@/types'
import { OverviewTab } from './tabs/OverviewTab'
import { ExpensesTab } from './tabs/ExpensesTab'
import { GoalsTab } from './tabs/GoalsTab'
import { FocusTab } from './tabs/FocusTab'
import { DisciplineTab } from './tabs/DisciplineTab'

type Tab = 'overview' | 'expenses' | 'goals' | 'focus' | 'discipline'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'goals', label: 'Goals' },
  { id: 'focus', label: 'Focus' },
  { id: 'discipline', label: 'Discipline' },
]

const TAB_LINKS: { href: string; label: string }[] = [
  { href: '/today', label: 'Today' },
  { href: '/habits', label: 'Habits' },
  { href: '/pills', label: 'Pills' },
  { href: '/plans', label: 'Plans' },
]

export interface JarvisDashboardProps {
  displayName: string | null
  goals: Goal[]
  expenses: Expense[]
  focusAreas: FocusArea[]
  focusCheckins: FocusCheckin[]
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  disciplineScores: DisciplineScore[]
  today: string
}

export function JarvisDashboard(props: JarvisDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const {
    displayName, today,
    goals, expenses, focusAreas, focusCheckins,
    habits, habitCompletions, disciplineScores,
  } = props

  const dayName = new Date(today).toLocaleString('en-GB', { weekday: 'short' }).toUpperCase()
  const dateDisplay = new Date(today).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase()

  return (
    <div className="min-h-full w-full">
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-mono text-3xl font-bold tracking-[0.2em] uppercase text-text-primary leading-none mb-3">
              JARVIS
            </h1>
            <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary">
              {dayName} · {dateDisplay}
            </p>
          </div>
          {displayName && (
            <div className="size-10 border border-border-visible shrink-0 flex items-center justify-center font-mono text-[13px] uppercase text-text-primary">
              {displayName[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>

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
        {TAB_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="font-mono text-[11px] tracking-[0.08em] uppercase pb-3 border-b-2 border-transparent text-text-disabled hover:text-text-secondary transition-colors whitespace-nowrap"
          >
            [ {label} ]
          </Link>
        ))}
      </div>

      <div className="px-6 py-5">
        {activeTab === 'overview' && (
          <OverviewTab
            today={today}
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
          <GoalsTab goals={goals} habits={habits} today={today} />
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
            goals={goals}
            today={today}
          />
        )}
      </div>
    </div>
  )
}
