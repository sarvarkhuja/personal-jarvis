'use client';

import { useState } from 'react';
import {
  formatDayLabel,
  type ConsistencyModel,
} from '@/lib/domain/habit-consistency';

interface Props {
  model: ConsistencyModel;
  windowDays: number;
}

/**
 * The page's signature instrument. One Doto readout (today's done/due) over a
 * 30-day consistency field where each bar's height is that day's completion
 * ratio. Green is the page's single colour and means exactly one thing:
 * "fully showed up" — a perfect day, or all of today's habits done.
 */
export function HabitsConsistencyInstrument({ model, windowDays }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const { days, dueToday, doneToday, totalHabits, perfectDays, best } = model;

  const allDone = dueToday > 0 && doneToday === dueToday;
  const verdict =
    dueToday === 0
      ? { text: 'NOTHING DUE', cls: 'text-text-secondary' }
      : allDone
        ? { text: 'ALL DONE', cls: 'text-success' }
        : { text: `${dueToday - doneToday} LEFT`, cls: 'text-text-secondary' };

  const ann = hover != null ? days[hover] : null;

  return (
    <section className="rounded-lg border border-border bg-surface p-6 md:p-8">
      {/* header rail: orient + verdict */}
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ CONSISTENCY · {windowDays}D ]
        </span>
        <span className={`font-mono text-[11px] uppercase tracking-[0.08em] ${verdict.cls}`}>
          <span className="sr-only">Today: </span>
          {verdict.text}
        </span>
      </div>

      {/* hero readout — the only Doto on the page */}
      <div className="mb-6 flex items-baseline gap-2">
        <span
          className={`font-doto text-6xl font-bold leading-none tracking-tight md:text-7xl ${
            allDone ? 'text-success' : 'text-text-display'
          }`}
        >
          {totalHabits === 0 ? '—' : doneToday}
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
          / {dueToday} DONE TODAY
        </span>
      </div>

      {/* the consistency field — one bar per day, height = completion ratio */}
      <div className="flex h-20 w-full items-end gap-[2px] md:h-24">
        {days.map((d, i) => {
          const label =
            d.due === 0
              ? `${formatDayLabel(d.date)}: nothing scheduled`
              : `${formatDayLabel(d.date)}: ${d.done} of ${d.due} done`;
          const isHover = hover === i;

          if (d.due === 0) {
            // Rest day: a faint baseline tick — present, but clearly "off".
            return (
              <button
                key={d.date}
                type="button"
                aria-label={label}
                aria-describedby="consistency-annotation"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="group relative flex h-full flex-1 items-end focus:outline-none"
              >
                <span
                  className={`w-full transition-colors ${
                    isHover ? 'bg-border-visible' : 'bg-border'
                  }`}
                  style={{ height: '2px' }}
                />
              </button>
            );
          }

          const perfect = d.ratio >= 1;
          const missed = d.done === 0;
          const heightPct = Math.max(8, Math.round(d.ratio * 100));
          const fill = perfect
            ? 'bg-success'
            : missed
              ? 'border border-border-visible bg-transparent'
              : 'bg-text-primary';

          return (
            <button
              key={d.date}
              type="button"
              aria-label={label}
              aria-describedby="consistency-annotation"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="relative flex h-full flex-1 items-end focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary"
            >
              <span
                className={`w-full transition-colors duration-200 ease-out motion-reduce:transition-none ${fill} ${
                  !perfect && !missed ? 'opacity-80' : ''
                } ${isHover ? 'ring-1 ring-text-primary' : ''}`}
                style={{ height: `${heightPct}%` }}
              />
              {d.isToday && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-text-secondary"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* strip markers */}
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        <span>{windowDays}D AGO</span>
        <span>TODAY</span>
      </div>

      {/* hover/focus annotation — height reserved → no layout shift */}
      <div
        id="consistency-annotation"
        role="status"
        aria-live="polite"
        className="mt-3 h-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary"
      >
        {ann && (
          <>
            {formatDayLabel(ann.date)} ·{' '}
            {ann.due === 0 ? (
              <span className="text-text-disabled">REST DAY</span>
            ) : (
              <span className={ann.ratio >= 1 ? 'text-success' : 'text-text-primary'}>
                {ann.done}/{ann.due} DONE
              </span>
            )}
          </>
        )}
      </div>

      {/* the one human sentence */}
      <p className="mt-5 max-w-2xl font-sans text-[15px] leading-snug text-text-secondary">
        {totalHabits === 0 ? (
          'No habits yet. Add one to start building a streak.'
        ) : dueToday === 0 ? (
          <>
            Nothing due today.
            {best ? (
              <>
                {' '}
                <span className="font-mono text-text-primary">{best.name}</span> is on a{' '}
                <span className="font-mono text-text-primary">{best.value}-day</span> run.
              </>
            ) : (
              ' A clear day to rest.'
            )}
          </>
        ) : allDone ? (
          <>
            All <span className="font-mono text-success">{dueToday}</span> done today.
            {best && (
              <>
                {' '}
                <span className="font-mono text-text-primary">{best.name}</span> leads at{' '}
                <span className="font-mono text-text-primary">{best.value}</span> days.
              </>
            )}
          </>
        ) : (
          <>
            <span className="font-mono text-text-primary">{doneToday}</span> of{' '}
            <span className="font-mono text-text-primary">{dueToday}</span> done today ·{' '}
            <span className="font-mono text-text-primary">{perfectDays}</span> perfect{' '}
            {perfectDays === 1 ? 'day' : 'days'} in {windowDays}.
            {best && (
              <>
                {' '}
                Best run <span className="font-mono text-text-primary">{best.value}</span> days.
              </>
            )}
          </>
        )}
      </p>
    </section>
  );
}
