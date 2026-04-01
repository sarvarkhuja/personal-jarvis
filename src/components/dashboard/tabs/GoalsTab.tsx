'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Goal } from '@/types'
import { addGoal, updateGoalProgress, completeGoal } from '@/actions/goals'

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

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Active goals */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-4">
          Active Goals · {activeGoals.length}
        </div>
        {activeGoals.length === 0 ? (
          <p className="font-mono text-xs text-[#333]">No active goals. Add one below.</p>
        ) : (
          <div className="space-y-4">
            {activeGoals.map(goal => {
              const pct = goal.target_value
                ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                : 0
              const daysLeft = goal.deadline
                ? Math.ceil((new Date(goal.deadline).getTime() - new Date(today).getTime()) / 86400000)
                : null

              return (
                <div key={goal.id} className="border border-[#1a1a1a] rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-sm font-semibold text-indigo-400">{goal.title}</p>
                      {goal.description && (
                        <p className="font-mono text-[10px] text-[#444] mt-0.5">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {daysLeft !== null && (
                        <Badge
                          variant="outline"
                          className={`font-mono text-[9px] ${
                            daysLeft < 7
                              ? 'text-red-400 border-red-500/30'
                              : 'text-[#444] border-[#222]'
                          }`}
                        >
                          {daysLeft}d left
                        </Badge>
                      )}
                      <button
                        onClick={() => handleComplete(goal.id)}
                        disabled={isPending}
                        className="font-mono text-[9px] text-[#333] hover:text-green-400 transition-colors"
                      >
                        ✓ done
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-[3px] bg-[#111] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-[#444] shrink-0">{pct}%</span>
                  </div>

                  {/* Current / Target + edit */}
                  <div className="flex items-center gap-2">
                    {editingId === goal.id ? (
                      <>
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-20 bg-[#111] border border-indigo-500/30 rounded px-2 py-1 font-mono text-xs text-indigo-400 focus:outline-none"
                          autoFocus
                        />
                        <span className="font-mono text-[9px] text-[#333]">
                          / {goal.target_value} {goal.unit}
                        </span>
                        <button
                          onClick={() => handleUpdateProgress(goal.id)}
                          className="font-mono text-[9px] text-indigo-400 hover:text-indigo-300"
                        >
                          save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="font-mono text-[9px] text-[#444] hover:text-[#888]"
                        >
                          cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-xs text-[#666]">
                          {goal.current_value} / {goal.target_value ?? '?'} {goal.unit}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(goal.id)
                            setEditValue(String(goal.current_value))
                          }}
                          className="font-mono text-[9px] text-[#333] hover:text-indigo-400 transition-colors"
                        >
                          update
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add goal form */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Add Goal</div>
        <form action={handleAddGoal} className="space-y-2">
          <input
            name="title"
            type="text"
            placeholder="Goal title"
            required
            className="w-full bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-indigo-500/50"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              name="target_value"
              type="number"
              step="any"
              placeholder="Target"
              className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-indigo-500/50"
            />
            <input
              name="unit"
              type="text"
              placeholder="Unit (kg, books…)"
              className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-indigo-500/50"
            />
            <input
              name="deadline"
              type="date"
              className="bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            variant="outline"
            className="w-full font-mono text-[10px] tracking-widest border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
          >
            {isPending ? 'ADDING...' : '+ ADD GOAL'}
          </Button>
        </form>
      </div>

      {/* Completed */}
      {completedGoals.length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">
            Completed · {completedGoals.length}
          </div>
          <div className="space-y-1">
            {completedGoals.map(goal => (
              <div key={goal.id} className="flex items-center gap-2 py-1">
                <span className="font-mono text-[9px] text-green-400">✓</span>
                <span className="font-mono text-[10px] text-[#444] line-through">{goal.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
