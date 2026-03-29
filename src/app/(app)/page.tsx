import { createClient } from '@/lib/supabase/server'
import { getCurrentProgrammePosition } from '@/lib/utils/week-calculator'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const TRAINING_DAY_NAMES: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 4: 'Thursday', 5: 'Friday',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('programme_start_date, display_name')
    .eq('id', user.id)
    .single()

  const startDate = profile?.programme_start_date
    ? new Date(profile.programme_start_date)
    : new Date()

  const position = getCurrentProgrammePosition(startDate)
  const progressPercent = Math.round((position.weekNumber / 12) * 100)

  const { data: blocks } = await supabase
    .from('blocks')
    .select('id')
    .lte('week_start', position.weekNumber)
    .gte('week_end', position.weekNumber)
    .single()

  const { data: todayDay } = blocks
    ? await supabase
        .from('programme_days')
        .select('id, name, emphasis')
        .eq('block_id', blocks.id)
        .eq('day_of_week', position.dayOfWeek)
        .single()
    : { data: null }

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const { data: weekSessions } = await supabase
    .from('workout_sessions')
    .select('session_date')
    .eq('user_id', user.id)
    .eq('week_number', position.weekNumber)
    .gte('session_date', weekStart.toISOString().split('T')[0])

  const completedDays = new Set(weekSessions?.map((s) => new Date(s.session_date).getDay()) ?? [])

  const { data: latestWeight } = await supabase
    .from('body_metrics')
    .select('weight_kg, date')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const trainingDayDows = [1, 2, 4, 5]

  return (
    <div className="pb-24">
      <Header title="Training" />
      <div className="p-4 space-y-4">

        {/* Week progress */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Week {position.weekNumber} of 12 · Block {position.blockName}</span>
              <span className="text-xs text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {position.isDeloadWeek && (
              <Badge variant="outline" className="mt-2 text-yellow-500 border-yellow-500/30">
                Deload Week
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Today's workout */}
        <Card>
          <CardContent className="pt-4">
            {position.isTrainingDay && todayDay ? (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Today</p>
                <p className="font-semibold">{todayDay.name}</p>
                {todayDay.emphasis && (
                  <p className="text-sm text-muted-foreground">{todayDay.emphasis}</p>
                )}
                <Link href="/workout" className="block mt-3">
                  <Button className="w-full">Start Workout</Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Today</p>
                <p className="font-semibold text-muted-foreground">Rest Day</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Next training: {position.dayOfWeek === 2 ? 'Thursday' : position.dayOfWeek === 5 ? 'Monday' : 'Tomorrow'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* This week's sessions */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">This Week</p>
            <div className="flex gap-3">
              {trainingDayDows.map((dow) => {
                const done = completedDays.has(dow)
                return (
                  <div key={dow} className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      done
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {done ? '✓' : ''}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {TRAINING_DAY_NAMES[dow]?.slice(0, 3)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bodyweight */}
        {latestWeight && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bodyweight</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{latestWeight.weight_kg} kg</span>
                <span className="text-sm text-muted-foreground">
                  Target: 80 kg
                </span>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
