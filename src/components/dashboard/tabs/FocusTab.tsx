'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { FocusArea, FocusCheckin } from '@/types'
import { addFocusArea, toggleCheckin } from '@/actions/focus'
import { calcStreak } from '@/lib/utils/dashboard-utils'

interface FocusTabProps {
  focusAreas: FocusArea[]
  focusCheckins: FocusCheckin[]
  today: string
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

export function FocusTab({ focusAreas, focusCheckins, today }: FocusTabProps) {
  const [isPending, startTransition] = useTransition()
  const days = last30DayKeys(today)

  function handleToggle(focusAreaId: string) {
    startTransition(() => { toggleCheckin(focusAreaId, today) })
  }

  function handleAdd(formData: FormData) {
    startTransition(() => { addFocusArea(formData) })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Focus areas */}
      {focusAreas.filter(a => a.is_active).length === 0 ? (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <p className="font-mono text-xs text-[#333]">No focus areas yet. Add one below.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {focusAreas.filter(a => a.is_active).map(area => {
            const areaCheckins = focusCheckins
              .filter(c => c.focus_area_id === area.id)
              .map(c => c.date)
            const checkinSet = new Set(areaCheckins)
            const streak = calcStreak(areaCheckins, today)
            const checkedToday = checkinSet.has(today)

            return (
              <div key={area.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{area.emoji}</span>
                    <span className="font-mono text-sm font-semibold text-[#ccc]">{area.name}</span>
                    {streak > 0 && (
                      <span className="font-mono text-xs text-cyan-400">{streak}d streak</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(area.id)}
                    disabled={isPending}
                    className={`font-mono text-[10px] tracking-widest px-3 py-1 rounded border transition-all ${
                      checkedToday
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                        : 'bg-[#111] border-[#222] text-[#444] hover:border-cyan-500/30 hover:text-cyan-400'
                    }`}
                  >
                    {checkedToday ? '✓ DONE' : '○ CHECK IN'}
                  </button>
                </div>

                {/* 30-day dot grid */}
                <div className="flex gap-[3px] flex-wrap">
                  {days.map(day => {
                    const done = checkinSet.has(day)
                    const isToday = day === today
                    return (
                      <div
                        key={day}
                        title={day}
                        className={`w-[10px] h-[10px] rounded-[2px] ${
                          done
                            ? 'bg-cyan-500/50 border border-cyan-500/40'
                            : isToday
                              ? 'bg-[#111] border border-cyan-500/20'
                              : 'bg-[#111] border border-[#1a1a1a]'
                        }`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[8px] text-[#333]">30 days ago</span>
                  <span className="font-mono text-[8px] text-[#333]">today</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add focus area */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">Add Focus Area</div>
        <form action={handleAdd} className="flex gap-2">
          <input
            name="emoji"
            type="text"
            placeholder="🎯"
            maxLength={2}
            className="w-12 bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-sm text-center text-[#aaa] focus:outline-none focus:border-cyan-500/50"
          />
          <input
            name="name"
            type="text"
            placeholder="Focus area name"
            required
            className="flex-1 bg-[#111] border border-[#222] rounded px-2 py-1.5 font-mono text-xs text-[#aaa] placeholder:text-[#333] focus:outline-none focus:border-cyan-500/50"
          />
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            variant="outline"
            className="font-mono text-[10px] tracking-widest border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 shrink-0"
          >
            + ADD
          </Button>
        </form>
      </div>
    </div>
  )
}
