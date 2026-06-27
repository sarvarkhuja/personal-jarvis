import { createClient } from '@/lib/supabase/server'
import { requireUserId } from '@/lib/auth/server-user'
import { WeeklyLiftsHero } from '@/components/workout/WeeklyLiftsHero'
import { WeeklyCheckCard } from '@/components/workout/WeeklyCheckCard'
import { ProgressionCard } from '@/components/workout/ProgressionCard'
import { WeightTrendCard } from '@/components/workout/WeightTrendCard'
import { formatUTCDate } from '@/lib/utils/workout-metrics'
import {
  weekStart,
  isoWeekNumber,
  addDays,
  buildLiftRows,
  type LiftEntry,
} from '@/lib/utils/lift-metrics'
import type { BodyMetrics, ProgressPhoto, WeeklyLift } from '@/types'

const PROGRESS_PHOTO_BUCKET = 'progress-photos'
const HISTORY_WEEKS = 8
const WEIGHT_TREND_DAYS = 90

export default async function WorkoutPage() {
  const userId = await requireUserId()
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const thisMonday = weekStart(today)
  const liftWindowStart = addDays(thisMonday, -7 * (HISTORY_WEEKS - 1))
  const weightWindowStart = addDays(today, -(WEIGHT_TREND_DAYS - 1))

  const [weeklyLiftsResult, bodyMetricsResult, progressPhotosResult, profileResult] =
    await Promise.all([
      supabase
        .from('weekly_lifts')
        .select('id, user_id, exercise, week_start, weight_kg, reps, created_at, updated_at')
        .eq('user_id', userId)
        .gte('week_start', liftWindowStart)
        .order('week_start', { ascending: false }),
      supabase
        .from('body_metrics')
        .select('id, user_id, date, weight_kg, waist_cm, arm_cm, leg_cm, forearm_cm, calf_cm, notes, created_at')
        .eq('user_id', userId)
        .gte('date', weightWindowStart)
        .order('date', { ascending: false }),
      supabase
        .from('progress_photos')
        .select('id, user_id, date, pose, storage_path, thumbnail_path, created_at')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(4),
      supabase
        .from('profiles')
        .select('target_weight_kg')
        .eq('id', userId)
        .single(),
    ])

  const weeklyLifts = (weeklyLiftsResult.data ?? []) as WeeklyLift[]
  const bodyMetrics = (bodyMetricsResult.data ?? []) as BodyMetrics[]
  const photos = (progressPhotosResult.data ?? []) as ProgressPhoto[]

  const liftEntries: LiftEntry[] = weeklyLifts.map((l) => ({
    exercise: l.exercise,
    week_start: l.week_start,
    weight_kg: l.weight_kg != null ? Number(l.weight_kg) : null,
    reps: l.reps,
  }))
  const rows = buildLiftRows(liftEntries, today, HISTORY_WEEKS)
  const loggedCount = rows.filter((r) => r.current != null).length
  const weekNumber = isoWeekNumber(today)

  const sunday = addDays(thisMonday, 6)
  const weekRange = `${formatUTCDate(thisMonday, { day: 'numeric', month: 'short' })} – ${formatUTCDate(sunday, { day: 'numeric', month: 'short' })}`.toUpperCase()
  const fullWeekLabel = `WEEK ${weekNumber} · ${formatUTCDate(thisMonday, { weekday: 'short', day: 'numeric', month: 'short' })} – ${formatUTCDate(sunday, { weekday: 'short', day: 'numeric', month: 'short' })}`.toUpperCase()

  const hasWeighInThisWeek = bodyMetrics.some(
    (b) => b.date >= thisMonday && b.weight_kg != null,
  )
  const recentWeights = bodyMetrics.map((b) => ({
    date: b.date,
    weight: b.weight_kg != null ? Number(b.weight_kg) : null,
  }))
  const targetWeight =
    profileResult.data?.target_weight_kg != null
      ? Number(profileResult.data.target_weight_kg)
      : null
  const hasPhotoThisWeek = photos.some((p) => p.date >= thisMonday)

  const recentPhotos = await Promise.all(
    photos.map(async (p) => {
      const path = p.thumbnail_path ?? p.storage_path
      try {
        const { data } = await supabase.storage
          .from(PROGRESS_PHOTO_BUCKET)
          .createSignedUrl(path, 60 * 60)
        return { id: p.id, date: p.date, signed_url: data?.signedUrl ?? null }
      } catch {
        return { id: p.id, date: p.date, signed_url: null }
      }
    }),
  )

  return (
    <div className="w-full px-4 py-8 pb-24">
      <header className="mb-6">
        <h1 className="mb-3 font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">
          WORKOUT
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {fullWeekLabel}
        </p>
      </header>

      <WeeklyLiftsHero
        rows={rows}
        weekNumber={weekNumber}
        weekRange={weekRange}
        weekStart={thisMonday}
        loggedCount={loggedCount}
      />

      <div className="mt-4 gap-4 [column-fill:_balance] columns-1 md:columns-2">
        <WeeklyCheckCard
          today={today}
          hasWeighInThisWeek={hasWeighInThisWeek}
          recentWeights={recentWeights}
          hasPhotoThisWeek={hasPhotoThisWeek}
          recentPhotos={recentPhotos}
        />
        <WeightTrendCard
          series={recentWeights}
          today={today}
          days={WEIGHT_TREND_DAYS}
          targetWeight={targetWeight}
        />
        <ProgressionCard rows={rows} weeks={HISTORY_WEEKS} />
      </div>
    </div>
  )
}
