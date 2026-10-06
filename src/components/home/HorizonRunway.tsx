'use client';

import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/workout-metrics';
import { FUTURE_HORIZONS, HORIZON_IDENTITY, horizonDate } from '@/lib/domain/future-self';
import type { SelfImageMonths } from '@/lib/schemas/self-images';

const label = 'font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary';

function daysBetween(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
}

/**
 * The signature instrument: one dot per week from today to the furthest horizon.
 * The horizon ticks double as the selector; the chosen runway lights up.
 */
export function HorizonRunway({ today, selected, onSelect, counts }: {
  today: string;
  selected: SelfImageMonths;
  onSelect: (months: SelfImageMonths) => void;
  counts: Record<SelfImageMonths, number>;
}) {
  const spans = FUTURE_HORIZONS.map((months) => {
    const end = horizonDate(today, months);
    return { months, end, days: daysBetween(today, end) };
  });
  const total = spans[spans.length - 1].days;
  const weeks = Math.ceil(total / 7);
  const current = spans.find((span) => span.months === selected)!;
  const { phase, identity } = HORIZON_IDENTITY[selected];
  const fullDate = (iso: string) => formatUTCDate(iso, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-16">
        <div>
          <p className="font-mono text-[clamp(72px,11vw,136px)] leading-[0.85] tracking-[-0.04em] text-text-display tabular-nums" aria-hidden>
            {String(current.days).padStart(3, '0')}
          </p>
          <p className={cn(label, 'mt-4')}>
            <span className="sr-only">{current.days} </span>Days to my {selected}-month self
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:pb-1">
          <p className={label}>{phase} / by {fullDate(current.end)} / {String(counts[selected]).padStart(2, '0')} statements</p>
          <p className="max-w-xl text-[clamp(26px,3vw,40px)] leading-[1.15] tracking-tight text-text-primary">{identity}</p>
        </div>
      </div>

      <div>
        <div className={cn(label, 'mb-3 flex justify-between text-text-disabled')}>
          <span>Now</span><span>1 dot = 1 week</span>
        </div>
        <div aria-hidden className="grid gap-px sm:gap-[3px] lg:gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {Array.from({ length: weeks }, (_, week) => (
            <span key={week} style={{ transitionDelay: `${week * 6}ms` }}
              className={cn('aspect-square rounded-full transition-colors duration-150 ease-out motion-reduce:transition-none',
                week * 7 < current.days ? 'bg-text-display' : 'bg-border-visible')} />
          ))}
        </div>
        <div className="relative mt-2 h-14" role="group" aria-label="Future self horizons">
          {spans.map(({ months, end, days }) => {
            const active = months === selected;
            const last = months === FUTURE_HORIZONS[FUTURE_HORIZONS.length - 1];
            return (
              <button key={months} type="button" aria-pressed={active} aria-controls="self-image-list"
                aria-label={`${months} months: ${HORIZON_IDENTITY[months].phase}, by ${fullDate(end)}`}
                onClick={() => onSelect(months)} style={{ left: `${(days / total) * 100}%` }}
                className={cn('group absolute top-0 flex min-h-11 min-w-11 flex-col whitespace-nowrap gap-1 pt-1 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary',
                  last ? '-translate-x-full items-end border-r pr-2 text-right' : 'border-l pl-2 text-left',
                  active ? 'border-text-display' : 'border-border-visible')}>
                <span className={cn('font-mono text-[13px] uppercase tracking-[0.06em]', active ? 'text-text-display' : 'text-text-secondary group-hover:text-text-primary')}>
                  {String(months).padStart(2, '0')} mo
                </span>
                <span className={cn(label, 'hidden text-text-disabled sm:block')}>{fullDate(end)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
