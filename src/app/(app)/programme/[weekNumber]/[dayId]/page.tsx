import { createClient } from '@/lib/supabase/server'
import { ExerciseRow } from '@/components/programme/ExerciseRow'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { ProgrammeExercise } from '@/types'

interface Props {
  params: Promise<{ weekNumber: string; dayId: string }>
}

export default async function DayViewPage({ params }: Props) {
  const { weekNumber, dayId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: day } = await supabase
    .from('programme_days')
    .select('*')
    .eq('id', dayId)
    .single()

  const { data: exercises } = await supabase
    .from('programme_exercises')
    .select('*')
    .eq('programme_day_id', dayId)
    .order('sort_order')

  if (!day) redirect('/programme')

  const isDeload = Number(weekNumber) === 4 || Number(weekNumber) === 8

  return (
    <div className="max-w-3xl px-6 py-6">
      <Link
        href="/programme"
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4 -ml-1"
      >
        <ChevronLeft className="h-4 w-4" /> Programme
      </Link>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{day.name}</h1>
          {isDeload && (
            <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">
              Deload
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Week {weekNumber}</p>
      </div>

      <div className="space-y-1">
        {(exercises ?? []).map((exercise: ProgrammeExercise) => (
          <ExerciseRow
            key={exercise.id}
            exercise={exercise}
            isDeloadWeek={isDeload}
          />
        ))}
      </div>
    </div>
  )
}
