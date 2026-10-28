'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  monthOfWeek,
  overallTally,
  weekTally,
  type ItemStatus,
  type paceSummary,
} from '@/lib/domain/roadmap';
import { ROADMAP_WEEKS } from '@/lib/domain/roadmap-data';

const mono = 'font-mono text-[11px] uppercase tracking-[0.08em]';
const WEEKS = Array.from({ length: 28 }, (_, i) => i + 1);
const MONTHS = Array.from({ length: 7 }, (_, i) => i + 1);

/** The one instrument: rail, done count, 28-week strip, pace line and activity dots. */
export function RoadmapHero({ statuses, selectedWeek, current, pace, dots, sentence }: {
  statuses: ItemStatus[];
  selectedWeek: number;
  current: number | null;
  pace: ReturnType<typeof paceSummary>;
  dots: boolean[];
  sentence: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const overall = overallTally(statuses);
  const verdict = current === null ? 'ALL CLEAR' : weekTally(statuses, selectedWeek).open === 0 ? 'WEEK CLEAR' : 'IN PROGRESS';
  const shown = hovered ?? selectedWeek;
  const shownTally = weekTally(statuses, shown);
  const shownTitle = ROADMAP_WEEKS.find((w) => w.week === shown)?.go ?? '';
  const annotation = `W${shown} · ${shownTitle.length > 60 ? `${shownTitle.slice(0, 60)}…` : shownTitle} · ${shownTally.done + shownTally.skipped}/5`;

  return (
    <section aria-label="Roadmap progress" className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6">
      <div className={cn(mono, 'flex items-baseline justify-between gap-3 text-text-secondary')}>
        <span>[ M{monthOfWeek(selectedWeek)} · WEEK {selectedWeek} OF 28 ]</span>
        <span className="text-text-primary">{verdict}</span>
      </div>

      <div>
        <p className="font-doto text-[clamp(64px,10vw,120px)] leading-[0.85] tracking-[-0.02em] text-text-display tabular-nums">
          {String(overall.done).padStart(3, '0')}
        </p>
        <p className={cn(mono, 'mt-3 text-text-secondary')}>/140 DONE · {overall.skipped} SKIPPED</p>
        {pace.remaining > 0 && (
          <p className={cn(mono, 'mt-2 text-text-disabled')}>
            ≈ {pace.perWeek} ITEMS/WK · FINISH ≈ {pace.finishMonth}
          </p>
        )}
        <div className="mt-3 flex items-center gap-1" role="img" aria-label={`Activity, last 14 days: ${dots.filter(Boolean).length} active`}>
          {dots.map((on, i) => (
            <span key={i} className={cn('size-1.5 rounded-full', on ? 'bg-text-display' : 'bg-border-visible')} />
          ))}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1 md:grid-cols-[repeat(28,minmax(0,1fr))]">
          {WEEKS.map((w) => {
            const t = weekTally(statuses, w);
            const resolved = t.done + t.skipped;
            const selected = w === selectedWeek;
            const first = w === current;
            return (
              <Link
                key={w}
                href={`/roadmap?w=${w}`}
                aria-label={`Week ${w}, ${t.done} of 5 done`}
                aria-current={selected ? 'true' : undefined}
                onMouseEnter={() => setHovered(w)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(w)}
                onBlur={() => setHovered(null)}
                className={cn(
                  'relative flex min-h-6 items-end overflow-hidden rounded-sm border',
                  first ? 'border-accent bg-accent' : 'border-border-visible bg-background',
                  selected && 'outline outline-2 outline-offset-1 outline-text-primary',
                )}
              >
                {!first && resolved > 0 && (
                  <span aria-hidden className="absolute inset-x-0 bottom-0 bg-text-display" style={{ height: `${(resolved / 5) * 100}%` }} />
                )}
              </Link>
            );
          })}
        </div>
        <div aria-hidden className={cn(mono, 'mt-2 grid grid-cols-7 text-[10px] text-text-disabled')}>
          {MONTHS.map((m) => <span key={m}>M{m}</span>)}
        </div>
        <p aria-live="polite" className={cn(mono, 'mt-3 min-h-4 text-text-secondary')}>{annotation}</p>
      </div>

      <p className="text-lg leading-snug tracking-tight text-text-primary">{sentence}</p>
    </section>
  );
}
