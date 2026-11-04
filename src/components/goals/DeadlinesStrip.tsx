'use client';

import { useState } from 'react';
import { daysBetween } from '@/lib/domain/goals';
import { countdownFor, TONE_TEXT } from '@/lib/domain/goal-display';
import type { BoardGoal } from '@/lib/domain/goal-board';

const fmtDay = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`)
    .toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

/**
 * Read-only line from today to the furthest deadline, one tick per dated active
 * goal. Deliberately quiet — the consistency instrument above owns the page's
 * big number; the nearest deadline is the strip's single accent.
 */
export function DeadlinesStrip({
  deadlines,
  undatedCount,
  today,
}: {
  /** Dated active goals, nearest first. */
  deadlines: BoardGoal[];
  undatedCount: number;
  today: string;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  if (deadlines.length === 0 && undatedCount === 0) return null;

  const nearest = deadlines[0] ?? null;
  const furthest = deadlines[deadlines.length - 1] ?? null;
  const span = furthest ? Math.max(1, daysBetween(today, furthest.target_date as string)) : 1;
  const pos = (g: BoardGoal) =>
    Math.min(100, Math.max(0, (daysBetween(today, g.target_date as string) / span) * 100));

  const hovered = deadlines.find((g) => g.id === hoveredId) ?? null;
  const nearestCd = nearest ? countdownFor(nearest.target_date, today, 'active') : null;

  return (
    <section
      data-testid="deadlines-strip"
      className="rounded-lg border border-border bg-surface px-6 py-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ DEADLINES ]
        </span>
        <span
          role="status"
          aria-live="polite"
          className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled"
        >
          {hovered ? (
            <>
              <span className="text-text-primary">{hovered.title}</span> ·{' '}
              {fmtDay(hovered.target_date as string)}
            </>
          ) : nearest && nearestCd ? (
            <>
              Next · <span className="text-text-primary">{nearest.title}</span> ·{' '}
              <span className={TONE_TEXT[nearestCd.tone === 'primary' ? 'accent' : nearestCd.tone]}>
                {nearestCd.label}
              </span>
            </>
          ) : null}
        </span>
      </div>

      {deadlines.length > 0 && (
        <>
          <div className="relative mt-3 h-8">
            <div aria-hidden className="absolute bottom-3 left-0 right-0 h-px bg-border-visible" />
            <div aria-hidden className="absolute bottom-3 left-0 h-3 w-[2px] bg-text-secondary" />
            {deadlines.map((g, i) => (
              <button
                key={g.id}
                type="button"
                style={{ left: `${pos(g)}%` }}
                onMouseEnter={() => setHoveredId(g.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(g.id)}
                onBlur={() => setHoveredId(null)}
                aria-label={`${g.title}: due ${fmtDay(g.target_date as string)}`}
                className="absolute bottom-3 flex h-6 w-6 -translate-x-1/2 items-end justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary"
              >
                <span
                  className={`block h-3.5 w-[2px] ${i === 0 ? 'bg-accent' : 'bg-text-primary'}`}
                />
              </button>
            ))}
          </div>
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            <span>TODAY</span>
            {furthest && <span>{fmtDay(furthest.target_date as string)}</span>}
          </div>
        </>
      )}

      {undatedCount > 0 && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
          + {undatedCount} without a deadline
        </p>
      )}
    </section>
  );
}
