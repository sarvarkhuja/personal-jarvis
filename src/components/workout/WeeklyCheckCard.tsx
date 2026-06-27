import type { ReactNode } from 'react'
import { formatUTCDate } from '@/lib/utils/workout-metrics'
import { BodyMetricsSheet } from './BodyMetricsSheet'
import { ProgressPhotoUploadSheet } from './ProgressPhotoUploadSheet'
import { DeletePhotoButton } from './DeletePhotoButton'

interface RecentWeight {
  date: string
  weight: number | null
}
interface RecentPhoto {
  id: string
  signed_url: string | null
  date: string
}

interface Props {
  today: string
  hasWeighInThisWeek: boolean
  recentWeights: RecentWeight[] // newest-first
  hasPhotoThisWeek: boolean
  recentPhotos: RecentPhoto[] // newest-first
}

function fmt(iso: string): string {
  return formatUTCDate(iso, { day: '2-digit', month: 'short' }).toUpperCase()
}

export function WeeklyCheckCard({
  today,
  hasWeighInThisWeek,
  recentWeights,
  hasPhotoThisWeek,
  recentPhotos,
}: Props) {
  const latestWeight = recentWeights.find((w) => w.weight != null) ?? null
  const latestPhoto = recentPhotos[0] ?? null
  const remaining = (hasWeighInThisWeek ? 0 : 1) + (hasPhotoThisWeek ? 0 : 1)

  return (
    <section className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ WEEKLY CHECK ]
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {remaining === 0 ? (
            <span className="text-text-primary">ALL DONE</span>
          ) : (
            <>
              <span className="text-text-primary">{remaining}</span> LEFT
            </>
          )}
        </span>
      </div>

      <Row
        done={hasWeighInThisWeek}
        label="WEIGH-IN"
        detail={
          hasWeighInThisWeek && latestWeight?.weight != null
            ? `${latestWeight.weight} KG · ${fmt(latestWeight.date)}`
            : 'PENDING THIS WEEK'
        }
        action={
          <BodyMetricsSheet
            triggerLabel={hasWeighInThisWeek ? 'Edit' : 'Log'}
            triggerVariant="ghost"
            defaults={{ date: today }}
            title="Log weigh-in"
          />
        }
      />
      <Row
        done={hasPhotoThisWeek}
        label="PHOTO"
        detail={
          hasPhotoThisWeek && latestPhoto
            ? `ADDED · ${fmt(latestPhoto.date)}`
            : 'PENDING THIS WEEK'
        }
        action={<ProgressPhotoUploadSheet triggerLabel="Add" />}
        last
      />

      {recentWeights.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            RECENT WEIGHTS
          </p>
          <div className="divide-y divide-border">
            {recentWeights.slice(0, 4).map((w) => (
              <div key={w.date} className="flex items-center justify-between py-1.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                  {fmt(w.date)}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-text-primary">
                  {w.weight != null ? `${w.weight.toFixed(1)} KG` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentPhotos.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            LATEST PHOTOS
          </p>
          <div className="flex gap-2">
            {recentPhotos.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="group relative aspect-[3/4] w-1/4 overflow-hidden rounded border border-border bg-surface-raised"
              >
                {p.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.signed_url}
                    alt={fmt(p.date)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-[8px] uppercase text-text-disabled">
                    NO PREVIEW
                  </div>
                )}
                <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <DeletePhotoButton id={p.id} label={fmt(p.date)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Row({
  done,
  label,
  detail,
  action,
  last,
}: {
  done: boolean
  label: string
  detail: string
  action: ReactNode
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 ${last ? '' : 'border-b border-border'}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`font-mono text-[13px] ${done ? 'text-text-primary' : 'text-text-disabled'}`}
        >
          {done ? '[✓]' : '[ ]'}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-primary">
            {label}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            {detail}
          </p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
