import type { ProgrammeExercise } from '@/types'
import { Badge } from '@/components/ui/badge'

interface ExerciseRowProps {
  exercise: ProgrammeExercise
  isDeloadWeek?: boolean
  suggestedWeight?: number | null
}

export function ExerciseRow({ exercise, isDeloadWeek, suggestedWeight }: ExerciseRowProps) {
  const repRange = exercise.is_timed
    ? `${exercise.time_seconds}s`
    : `${exercise.reps_min}–${exercise.reps_max}`

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{exercise.exercise_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exercise.sets} × {repRange}
            {exercise.tempo ? ` · ${exercise.tempo}` : ''}
            {' · '}
            {Math.floor(exercise.rest_seconds / 60) > 0
              ? `${Math.floor(exercise.rest_seconds / 60)}m${exercise.rest_seconds % 60 > 0 ? `${exercise.rest_seconds % 60}s` : ''}`
              : `${exercise.rest_seconds}s`} rest
          </p>
          {exercise.coach_note && (
            <p className="text-xs text-muted-foreground/70 mt-1 italic">{exercise.coach_note}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isDeloadWeek && suggestedWeight && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-xs">
              {suggestedWeight} kg
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
