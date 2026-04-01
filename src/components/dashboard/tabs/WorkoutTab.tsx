'use client'

import Link from 'next/link'
import type { ProgrammePosition } from '@/types'

const TRAINING_DAY_NAMES: Record<number, string> = {
  1: 'MON', 2: 'TUE', 4: 'THU', 5: 'FRI',
}

const NEXT_TRAINING_DAY: Record<number, string> = {
  0: 'MONDAY', 1: 'TUESDAY', 2: 'THURSDAY', 3: 'THURSDAY',
  4: 'FRIDAY', 5: 'MONDAY', 6: 'MONDAY',
}

interface WorkoutTabProps {
  position: ProgrammePosition
  todayDay: { id: string; name: string; emphasis: string | null } | null
  completedDows: number[]
  latestWeight: { weight_kg: number | null; date: string } | null
  targetWeightKg: number | null
}

export function WorkoutTab({
  position,
  todayDay,
  completedDows,
  latestWeight,
  targetWeightKg,
}: WorkoutTabProps) {
  const progressPercent = Math.round((position.weekNumber / 12) * 100)
  const completedSet = new Set(completedDows)
  const trainingDayDows = [1, 2, 4, 5]

  return (
    <div className="space-y-8 max-w-4xl w-full">
      {/* Week progress */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-8">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary">
            [ WEEK PROGRESS ]
          </span>
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-primary">[{progressPercent}%]</span>
        </div>
        
        <div className="flex gap-[2px] h-[8px] mb-8">
          {Array.from({ length: 48 }).map((_, i) => {
            const isFilled = i < progressPercent / (100 / 48);
            return (
              <div
                key={i}
                className={`flex-[1_0_0%] ${isFilled ? 'bg-text-display' : 'bg-border'}`}
              />
            )
          })}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-primary">
            WEEK {position.weekNumber} OF 12 · BLOCK {position.blockName}
          </span>
          {position.isDeloadWeek && (
            <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-warning border border-warning px-2 py-1">
              DELOAD
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today */}
        <div className="bg-surface border border-border rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ TODAY ]</div>
            {position.isTrainingDay && todayDay ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-none bg-text-display animate-pulse" />
                  <span className="font-mono text-[13px] tracking-[0.08em] uppercase text-text-display">{todayDay.name}</span>
                </div>
                {todayDay.emphasis && (
                  <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-disabled mb-6">{todayDay.emphasis}</p>
                )}
              </>
            ) : (
              <>
                <span className="font-mono text-[13px] tracking-[0.08em] uppercase text-text-primary">REST DAY</span>
                <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-disabled mt-2 mb-6">
                  NEXT: {NEXT_TRAINING_DAY[position.dayOfWeek]}
                </p>
              </>
            )}
          </div>
          {position.isTrainingDay && todayDay && (
            <Link href="/workout" className="w-full">
              <button className="w-full bg-text-display text-background font-mono text-[13px] tracking-[0.06em] uppercase h-11 rounded-full hover:opacity-90 transition-opacity">
                START WORKOUT
              </button>
            </Link>
          )}
        </div>

        {/* This week */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-6">[ THIS WEEK ]</div>
          <div className="flex gap-4">
            {trainingDayDows.map((dow) => {
              const done = completedSet.has(dow)
              const isTodayDow = position.dayOfWeek === dow
              return (
                <div key={dow} className="flex flex-col items-center gap-3">
                  <div className={`w-10 h-10 rounded-none border border-border-visible flex items-center justify-center font-mono text-[13px] uppercase transition-colors ${
                    done
                      ? 'bg-text-display text-background border-text-display'
                      : isTodayDow
                        ? 'bg-surface text-text-primary border-text-primary'
                        : 'bg-transparent text-text-disabled'
                  }`}>
                    {done ? '✓' : '·'}
                  </div>
                  <span className={`font-mono text-[9px] tracking-[0.08em] uppercase ${isTodayDow ? 'text-text-primary' : 'text-text-disabled'}`}>
                    {TRAINING_DAY_NAMES[dow]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bodyweight */}
      {latestWeight?.weight_kg && (
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary mb-4">[ BODYWEIGHT ]</div>
          <div className="flex items-baseline gap-4">
            <span className="font-doto text-6xl font-bold tracking-tight text-text-display leading-none">
              {latestWeight.weight_kg}
            </span>
            <span className="font-mono text-[13px] tracking-[0.08em] uppercase text-text-disabled">KG</span>
            <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary ml-4">
              [ TARGET: {targetWeightKg ?? 80} KG ]
            </span>
          </div>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <Link href="/programme" className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-secondary hover:text-text-primary transition-colors">
          [ VIEW FULL PROGRAMME ↗ ]
        </Link>
      </div>
    </div>
  )
}
