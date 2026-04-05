'use client'

import { useState, useTransition } from 'react'
import type { Goal } from '@/types'
import { addGoal, updateGoalProgress, completeGoal, deleteGoal } from '@/actions/goals'

interface GoalsTabProps {
  goals: Goal[]
  today: string
}

export function GoalsTab({ goals, today }: GoalsTabProps) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  function handleAddGoal(formData: FormData) {
    startTransition(() => { addGoal(formData) })
  }

  function handleUpdateProgress(id: string) {
    const value = parseFloat(editValue)
    if (isNaN(value)) return
    startTransition(() => {
      updateGoalProgress(id, value)
      setEditingId(null)
    })
  }

  function handleComplete(id: string) {
    startTransition(() => { completeGoal(id) })
  }

  function handleDelete(id: string) {
    startTransition(() => { deleteGoal(id) })
  }

  return (
    <div className="space-y-8 max-w-2xl w-full">
      {/* Active goals */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-8">
          [ ACTIVE GOALS · {activeGoals.length} ]
        </div>
        {activeGoals.length === 0 ? (
          <p className="font-mono text-sm text-text-disabled uppercase">No active goals. Add one below.</p>
        ) : (
          <div className="space-y-8">
            {activeGoals.map(goal => {
              const pct = goal.target_value
                ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                : 0
              const daysLeft = goal.deadline
                ? Math.ceil((new Date(goal.deadline).getTime() - new Date(today).getTime()) / 86400000)
                : null

              return (
                <div key={goal.id} className="border border-border rounded-none p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-mono text-[13px] tracking-[0.08em] uppercase text-text-primary">{goal.title}</p>
                      {goal.description && (
                        <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-disabled mt-2">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      {daysLeft !== null && (
                        <span className={`font-mono text-[11px] tracking-[0.08em] uppercase border px-2 py-1 rounded-none ${
                            daysLeft < 7
                              ? 'text-accent border-accent'
                              : 'text-text-secondary border-border-visible'
                          }`}
                        >
                          {daysLeft}D LEFT
                        </span>
                      )}
                      <button
                        onClick={() => handleComplete(goal.id)}
                        disabled={isPending}
                        className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary hover:text-success transition-colors disabled:opacity-50"
                      >
                        [ ✓ DONE ]
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        disabled={isPending}
                        className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary hover:text-accent transition-colors disabled:opacity-50"
                      >
                        [ ✕ ]
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 flex gap-[2px] h-[8px]">
                      {Array.from({ length: 40 }).map((_, i) => {
                        const isFilled = i < pct / 2.5;
                        return (
                          <div
                            key={i}
                            className={`flex-[1_0_0%] ${isFilled ? 'bg-text-display' : 'bg-border'}`}
                          />
                        )
                      })}
                    </div>
                    <span className="font-mono text-[13px] tracking-[0.08em] text-text-primary shrink-0">{pct}%</span>
                  </div>

                  {/* Current / Target + edit */}
                  <div className="flex items-center gap-4 mt-6">
                    {editingId === goal.id ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-24 bg-transparent border-b border-border-visible focus:border-text-primary text-text-primary px-2 py-1 font-mono text-[13px] transition-colors outline-none"
                          autoFocus
                        />
                        <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary">
                          / {goal.target_value} {goal.unit}
                        </span>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleUpdateProgress(goal.id)}
                            className="font-mono text-[11px] tracking-[0.08em] uppercase px-3 py-1 border border-border-visible text-text-primary hover:border-text-primary transition-colors"
                          >
                            SAVE
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="font-mono text-[11px] tracking-[0.08em] uppercase px-3 py-1 text-text-secondary hover:text-text-primary transition-colors"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary">
                          {goal.current_value} / {goal.target_value ?? '?'} {goal.unit}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(goal.id)
                            setEditValue(String(goal.current_value))
                          }}
                          className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary hover:text-text-primary transition-colors"
                        >
                          [ UPDATE ]
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add goal form */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ ADD GOAL ]</div>
        <form action={handleAddGoal} className="space-y-4">
          <input
            name="title"
            type="text"
            placeholder="GOAL TITLE"
            required
            className="w-full bg-transparent border-b border-border-visible py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors"
          />
          <div className="grid grid-cols-3 gap-6">
            <input
              name="target_value"
              type="number"
              step="any"
              placeholder="TARGET"
              className="bg-transparent border-b border-border-visible py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors"
            />
            <input
              name="unit"
              type="text"
              placeholder="UNIT"
              className="bg-transparent border-b border-border-visible py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors"
            />
            <input
              name="deadline"
              type="date"
              className="bg-transparent border-b border-border-visible py-2 font-mono text-[13px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors uppercase tracking-[0.08em] appearance-none"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-8 bg-text-display text-background font-mono text-[13px] tracking-[0.06em] uppercase h-11 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? '[ ADDING ]' : 'ADD GOAL'}
          </button>
        </form>
      </div>

      {/* Completed */}
      {completedGoals.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">
            [ COMPLETED · {completedGoals.length} ]
          </div>
          <div className="space-y-0">
            {completedGoals.map((goal, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <div key={goal.id} className={`flex items-center gap-4 py-3 ${!isLast ? 'border-b border-border' : ''}`}>
                  <span className="font-mono text-[13px] text-success">✓</span>
                  <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-disabled line-through flex-1">{goal.title}</span>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    disabled={isPending}
                    className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-disabled hover:text-accent transition-colors disabled:opacity-50"
                  >
                    [ ✕ ]
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
