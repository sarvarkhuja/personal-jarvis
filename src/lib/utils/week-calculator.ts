import type { ProgrammePosition } from '@/types'

const TRAINING_DAYS = [1, 2, 4, 5] // Mon, Tue, Thu, Fri

export function getCurrentProgrammePosition(startDate: Date): ProgrammePosition {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const daysElapsed = Math.max(
    0,
    Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  )

  const weekNumber = Math.min(Math.floor(daysElapsed / 7) + 1, 12)
  const blockName: 'A' | 'B' | 'C' =
    weekNumber <= 4 ? 'A' : weekNumber <= 8 ? 'B' : 'C'
  const isDeloadWeek = weekNumber === 4 || weekNumber === 8
  const dayOfWeek = now.getDay()
  const isTrainingDay = TRAINING_DAYS.includes(dayOfWeek)

  return {
    weekNumber,
    blockName,
    isDeloadWeek,
    dayOfWeek,
    isTrainingDay,
    daysElapsed,
  }
}
