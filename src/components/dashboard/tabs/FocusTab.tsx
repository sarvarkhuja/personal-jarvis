'use client'

import { useTransition } from 'react'
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
    <div className="space-y-8 max-w-2xl w-full">
      {/* Focus areas */}
      {focusAreas.filter(a => a.is_active).length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-16 flex items-center justify-center">
          <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-disabled">[ NO FOCUS AREAS YET ]</p>
        </div>
      ) : (
        <div className="space-y-4">
          {focusAreas.filter(a => a.is_active).map(area => {
            const areaCheckins = focusCheckins
              .filter(c => c.focus_area_id === area.id)
              .map(c => c.date)
            const checkinSet = new Set(areaCheckins)
            const streak = calcStreak(areaCheckins, today)
            const checkedToday = checkinSet.has(today)

            return (
              <div key={area.id} className="bg-surface border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[13px] tracking-[0.08em] uppercase text-text-secondary">{area.emoji}</span>
                    <span className="font-mono text-[13px] tracking-[0.08em] uppercase text-text-primary">{area.name}</span>
                    {streak > 0 && (
                      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-interactive">[{streak}D STREAK]</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(area.id)}
                    disabled={isPending}
                    className={`font-mono text-[11px] tracking-[0.08em] uppercase px-4 py-2 rounded-full border transition-all disabled:opacity-50 ${
                      checkedToday
                        ? 'bg-text-display border-text-display text-background'
                        : 'bg-transparent border-border-visible text-text-primary hover:border-text-primary'
                    }`}
                  >
                    {checkedToday ? '[ ✓ DONE ]' : '[ CHECK IN ]'}
                  </button>
                </div>

                {/* 30-day dot grid */}
                <div className="flex gap-[4px] flex-wrap">
                  {days.map((day, idx) => {
                    const done = checkinSet.has(day)
                    const isToday = day === today
                    return (
                      <div
                        key={day}
                        title={day}
                        className={`w-[14px] h-[14px] rounded-none border ${
                          done
                            ? 'bg-text-display border-text-display'
                            : isToday
                              ? 'bg-transparent border-text-primary'
                              : 'bg-transparent border-border-visible'
                        }`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-3">
                  <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-text-disabled">30 DAYS AGO</span>
                  <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-text-primary">TODAY</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add focus area */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ ADD FOCUS AREA ]</div>
        <form action={handleAdd} className="flex gap-4">
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
            placeholder="FOCUS AREA NAME"
            required
            className="flex-1 bg-transparent border-b border-border-visible py-2 font-mono text-[13px] uppercase tracking-[0.08em] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-text-primary transition-colors"
          />
          <button
            type="submit"
            disabled={isPending}
            className="font-mono text-[11px] tracking-[0.08em] uppercase bg-transparent border border-border-visible text-text-primary px-6 py-2 hover:border-text-primary transition-colors disabled:opacity-50"
          >
            + ADD
          </button>
        </form>
      </div>
    </div>
  )
}
