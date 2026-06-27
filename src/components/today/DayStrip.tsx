'use client';

import { useState } from 'react';

export type StripEvent = {
  id: string;
  title: string;
  kind: 'event' | 'appointment' | 'milestone';
  /** Minutes since local midnight. */
  startMin: number;
  /** End minutes since local midnight, or null for a point-in-time event. */
  endMin: number | null;
  /** Pre-formatted `HH:mm` in the user's timezone. */
  timeLabel: string;
};

// The day clock runs from the first useful hour to midnight — the deadline the
// hero counts down to. Positions outside the window clamp to the nearest edge.
const DAY_START = 6 * 60; // 06:00
const DAY_END = 24 * 60; // midnight
const SPAN = DAY_END - DAY_START;
const pct = (min: number) =>
  Math.min(100, Math.max(0, ((min - DAY_START) / SPAN) * 100));

/**
 * Today's signature instrument: a Doto count of open loops over a horizontal
 * day clock. Elapsed time fills from dawn to a NOW needle; today's events sit
 * as ticks whose opacity encodes past / now / upcoming. Same instrument family
 * as the Expenses burn strip and the Goals horizon.
 */
export function DayStrip({
  dateLabel,
  nowLabel,
  nowMinutes,
  openHabits,
  pendingPills,
  focusMinutes,
  events,
}: {
  dateLabel: string;
  nowLabel: string;
  nowMinutes: number;
  openHabits: number;
  pendingPills: number;
  focusMinutes: number;
  events: StripEvent[];
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const openCount = openHabits + pendingPills;
  const evs = [...events].sort((a, b) => a.startMin - b.startMin);
  const nextEvent = evs.find((e) => e.startMin >= nowMinutes) ?? null;
  const hovered = hoveredId ? (evs.find((e) => e.id === hoveredId) ?? null) : null;

  const nowPct = pct(nowMinutes);
  // The NOW label rides the same position as the needle; the translate keeps it
  // inside the card at the extremes (left-aligned near dawn, right near night).
  const nowLabelShift = nowPct < 12 ? '0' : nowPct > 88 ? '-100%' : '-50%';
  // Drop whichever fixed edge label the needle is about to sit on.
  const showStartLabel = nowPct > 15;
  const showEndLabel = nowPct < 85;

  const tickColor = (e: StripEvent) => {
    if (e.endMin != null && e.startMin <= nowMinutes && nowMinutes < e.endMin)
      return 'bg-text-primary'; // happening now
    if (e.startMin < nowMinutes) return 'bg-text-disabled'; // past
    return 'bg-text-secondary'; // upcoming
  };

  // ── the one human sentence ──────────────────────────────────────────────
  const segs: string[] = [];
  if (openHabits > 0)
    segs.push(`${openHabits} habit${openHabits === 1 ? '' : 's'}`);
  if (pendingPills > 0)
    segs.push(`${pendingPills} pill${pendingPills === 1 ? '' : 's'}`);
  let sentence: string;
  if (openCount === 0) {
    sentence =
      focusMinutes > 0
        ? `Everything's logged — ${focusMinutes} minute${focusMinutes === 1 ? '' : 's'} focused so far. Enjoy the rest of the day.`
        : `Everything's logged. Nothing left to close today.`;
  } else {
    const nextBit = nextEvent
      ? ` · next up ${nextEvent.title} at ${nextEvent.timeLabel}`
      : '';
    sentence = `${segs.join(' and ')} still pending${nextBit}.`;
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6 md:p-8">
      {/* header rail: orient + day's totals */}
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ TODAY · {dateLabel} ]
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {focusMinutes} MIN FOCUS · {events.length}{' '}
          {events.length === 1 ? 'EVENT' : 'EVENTS'}
        </span>
      </div>

      {/* hero: open loops — the only Doto on the page */}
      <div className="mb-8 flex items-baseline gap-3">
        <span
          className={`font-doto text-6xl font-bold leading-none tracking-tight md:text-[80px] ${
            openCount === 0 ? 'text-success' : 'text-text-display'
          }`}
          data-testid="open-loops"
        >
          {openCount}
        </span>
        <div className="flex min-w-0 flex-col gap-1 pb-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
            {openCount === 0
              ? 'ALL CLEAR'
              : openCount === 1
                ? 'OPEN LOOP'
                : 'OPEN LOOPS'}
          </span>
          <span className="font-sans text-[13px] text-text-secondary">
            {openCount === 0 ? 'nothing left to close' : 'to close before midnight'}
          </span>
        </div>
      </div>

      {/* hover inspector — height reserved → no layout shift */}
      <div
        role="status"
        aria-live="polite"
        className="mb-3 h-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary"
      >
        {hovered && (
          <>
            <span className="text-text-primary">{hovered.timeLabel}</span> ·{' '}
            {hovered.title}
          </>
        )}
      </div>

      {/* the day clock */}
      <div className="relative h-10">
        {/* day axis */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-6 h-px bg-border-visible"
        />
        {/* elapsed fill — dawn to now */}
        <div
          aria-hidden
          className="absolute left-0 top-[23px] h-[3px] bg-text-primary"
          style={{ width: `${nowPct}%` }}
        />
        {/* event ticks, above the line */}
        {evs.map((e) => (
          <button
            key={e.id}
            type="button"
            style={{ left: `${pct(e.startMin)}%` }}
            onMouseEnter={() => setHoveredId(e.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(e.id)}
            onBlur={() => setHoveredId(null)}
            aria-label={`${e.timeLabel} ${e.title}`}
            className="absolute top-2 flex h-6 w-6 -translate-x-1/2 items-start justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary"
          >
            <span
              className={`block h-4 w-[2px] transition-colors duration-200 ease-out motion-reduce:transition-none ${tickColor(e)}`}
            />
          </button>
        ))}
        {/* NOW needle — the sole reference mark, crossing below the line */}
        <div
          aria-hidden
          className="absolute top-4 h-5 w-[2px] -translate-x-1/2 bg-text-primary"
          style={{ left: `${nowPct}%` }}
        />
        <div
          aria-hidden
          className="absolute top-[22px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-text-primary"
          style={{ left: `${nowPct}%` }}
        />
      </div>

      {/* axis labels */}
      <div className="relative mb-6 h-4">
        {showStartLabel && (
          <span className="absolute left-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            06:00
          </span>
        )}
        <span
          className="absolute whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.08em] text-text-primary"
          style={{ left: `${nowPct}%`, transform: `translateX(${nowLabelShift})` }}
        >
          NOW {nowLabel}
        </span>
        {showEndLabel && (
          <span className="absolute right-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            MIDNIGHT
          </span>
        )}
      </div>

      {/* the one human sentence */}
      <p className="font-sans text-[15px] leading-snug text-text-secondary">
        {sentence}
      </p>
    </section>
  );
}
