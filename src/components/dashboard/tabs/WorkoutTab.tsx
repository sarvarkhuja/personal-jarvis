'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProgrammePosition } from '@/types'

const TRAINING_DAY_NAMES: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 4: 'Thu', 5: 'Fri',
}

const NEXT_TRAINING_DAY: Record<number, string> = {
  0: 'Monday', 1: 'Tuesday', 2: 'Thursday', 3: 'Thursday',
  4: 'Friday', 5: 'Monday', 6: 'Monday',
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
    <div className="space-y-4 max-w-4xl">
      {/* Week progress */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs tracking-widest uppercase text-[#444]">
            Week Progress
          </span>
          <span className="font-mono text-xs text-[#444]">{progressPercent}%</span>
        </div>
        <div className="h-1 bg-[#111] rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-[#444]">
            Week {position.weekNumber} of 12 · Block {position.blockName}
          </span>
          {position.isDeloadWeek && (
            <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px] font-mono">
              DELOAD
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-2">Today</div>
          {position.isTrainingDay && todayDay ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-sm font-semibold text-green-400">{todayDay.name}</span>
              </div>
              {todayDay.emphasis && (
                <p className="font-mono text-xs text-[#555] mb-3">{todayDay.emphasis}</p>
              )}
              <Link href="/workout">
                <Button size="sm" className="w-full font-mono text-xs tracking-widest">
                  START WORKOUT
                </Button>
              </Link>
            </>
          ) : (
            <>
              <span className="font-mono text-sm text-[#444]">Rest Day</span>
              <p className="font-mono text-xs text-[#333] mt-1">
                Next: {NEXT_TRAINING_DAY[position.dayOfWeek]}
              </p>
            </>
          )}
        </div>

        {/* This week */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-3">This Week</div>
          <div className="flex gap-3">
            {trainingDayDows.map((dow) => {
              const done = completedSet.has(dow)
              return (
                <div key={dow} className="flex flex-col items-center gap-1">
                  <div className={`size-8 rounded-full flex items-center justify-center font-mono text-xs ${
                    done
                      ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                      : 'bg-[#111] border border-[#222] text-[#333]'
                  }`}>
                    {done ? '✓' : '·'}
                  </div>
                  <span className="font-mono text-[9px] text-[#333]">{TRAINING_DAY_NAMES[dow]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bodyweight */}
      {latestWeight?.weight_kg && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
          <div className="font-mono text-[9px] tracking-widest uppercase text-[#444] mb-2">Bodyweight</div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-bold text-green-400">
              {latestWeight.weight_kg}
              <span className="text-sm font-normal text-[#444] ml-1">kg</span>
            </span>
            <span className="font-mono text-xs text-[#333]">
              Target: {targetWeightKg ?? 80} kg
            </span>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Link href="/programme" className="font-mono text-[10px] tracking-widest uppercase text-[#444] hover:text-green-400 transition-colors">
          → View Full Programme
        </Link>
      </div>
    </div>
  )
}
