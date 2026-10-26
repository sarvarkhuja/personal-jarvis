import { Suspense } from 'react'
import { createReadClient } from '@/lib/supabase/read'
import { requireUserId } from '@/lib/auth/server-user'
import { loadProfile } from '@/lib/data/profile'
import { WeeklyLiftsHero } from '@/components/workout/WeeklyLiftsHero'
import { WeeklyCheckCard } from '@/components/workout/WeeklyCheckCard'
import { ProgressionCard } from '@/components/workout/ProgressionCard'
import { WeightTrendCard } from '@/components/workout/WeightTrendCard'
import { Skeleton } from '@/components/ui/skeleton'
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

type RecentPhoto = { id: string; date: string; signed_url: string | null }

async function loadRecentPhotos(
  supabase: Awaited<ReturnType<typeof createReadClient>>,
  userId: string,
): Promise<RecentPhoto[]> {
  const { data } = await supabase
    .from('progress_photos')
    .select('id, date, storage_path, thumbnail_path')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(4)
  const photos = (data ?? []) as Pick<ProgressPhoto, 'id' | 'date' | 'storage_path' | 'thumbnail_path'>[]
  if (photos.length === 0) return []

  try {
    const { data: signed } = await supabase.storage
      .from(PROGRESS_PHOTO_BUCKET)
      .createSignedUrls(photos.map((p) => p.thumbnail_path ?? p.storage_path), 60 * 60)
    const urlsByPath = new Map(
      (signed ?? []).filter((entry) => !entry.error).map((entry) => [entry.path, entry.signedUrl]),
    )
    return photos.map((p) => ({
      id: p.id,
      date: p.date,
      signed_url: urlsByPath.get(p.thumbnail_path ?? p.storage_path) ?? null,
    }))
  } catch {
    return photos.map((p) => ({ id: p.id, date: p.date, signed_url: null }))
  }
}

async function WeeklyCheckSection({
  photosPromise,
  today,
  thisMonday,
  hasWeighInThisWeek,
  recentWeights,
}: {
  photosPromise: Promise<RecentPhoto[]>
  today: string
  thisMonday: string
  hasWeighInThisWeek: boolean
  recentWeights: { date: string; weight: number | null }[]
}) {
  const recentPhotos = await photosPromise
  return (
    <WeeklyCheckCard
      today={today}
      hasWeighInThisWeek={hasWeighInThisWeek}
      recentWeights={recentWeights}
      hasPhotoThisWeek={recentPhotos.some((p) => p.date >= thisMonday)}
      recentPhotos={recentPhotos}
    />
  )
}

function WeeklyCheckSkeleton() {
  return (
    <section
      role="status"
      aria-label="Loading weekly check"
      className="mb-4 flex min-h-64 break-inside-avoid flex-col gap-6 rounded-lg border border-border bg-surface p-6"
    >
      <span className="sr-only">Loading weekly check…</span>
      <Skeleton aria-hidden className="h-4 w-32 motion-reduce:animate-none" />
      <Skeleton aria-hidden className="h-12 w-full motion-reduce:animate-none" />
      <Skeleton aria-hidden className="h-12 w-full motion-reduce:animate-none" />
    </section>
  )
}

export default async function WorkoutPage() {
  const userId = await requireUserId()
  const supabase = await createReadClient(userId)

  const today = new Date().toISOString().split('T')[0]
  const thisMonday = weekStart(today)
  const liftWindowStart = addDays(thisMonday, -7 * (HISTORY_WEEKS - 1))
  const weightWindowStart = addDays(today, -(WEIGHT_TREND_DAYS - 1))

  // Signing depends only on the photos query, so let that pipeline run while
  // the independent lift, weight and profile reads finish.
  const photosPromise = loadRecentPhotos(supabase, userId)
  const [weeklyLiftsResult, bodyMetricsResult, profile] =
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
      loadProfile(userId),
    ])

  const weeklyLifts = (weeklyLiftsResult.data ?? []) as WeeklyLift[]
  const bodyMetrics = (bodyMetricsResult.data ?? []) as BodyMetrics[]

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
    profile.target_weight_kg != null
      ? Number(profile.target_weight_kg)
      : null

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
        <Suspense fallback={<WeeklyCheckSkeleton />}>
          <WeeklyCheckSection
            photosPromise={photosPromise}
            today={today}
            thisMonday={thisMonday}
            hasWeighInThisWeek={hasWeighInThisWeek}
            recentWeights={recentWeights}
          />
        </Suspense>
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
