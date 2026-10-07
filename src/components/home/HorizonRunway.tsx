'use client';

import { useState, useTransition } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/workout-metrics';
import { setFutureSelfStart } from '@/lib/actions/self-images';
import { FUTURE_HORIZONS, HORIZON_IDENTITY, type Runway } from '@/lib/domain/future-self';
import type { SelfImageMonths } from '@/lib/schemas/self-images';

const label = 'font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary';
const mono = 'min-h-11 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.06em]';
const pad = (n: number) => String(n).padStart(3, '0');
const fullDate = (iso: string) => formatUTCDate(iso, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();

/**
 * The signature instrument: one dot per week from the start date to the furthest
 * horizon. Lived weeks are solid, the current week is the red dot, and the
 * horizon ticks double as the selector.
 */
export function HorizonRunway({ runway, today, selected, onSelect, counts }: {
  runway: Runway;
  today: string;
  selected: SelfImageMonths;
  onSelect: (months: SelfImageMonths) => void;
  counts: Record<SelfImageMonths, number>;
}) {
  const { total, elapsed, weeks, spans } = runway;
  const current = spans.find((span) => span.months === selected)!;
  const { phase, identity } = HORIZON_IDENTITY[selected];
  const finished = elapsed >= total;
  const progress = current.reached
    ? `reached ${fullDate(current.end)}`
    : `day ${pad(Math.min(elapsed + 1, current.length))} of ${pad(current.length)} / by ${fullDate(current.end)}`;

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-16">
        <div>
          <p className="font-mono text-[clamp(72px,11vw,136px)] leading-[0.85] tracking-[-0.04em] text-text-display tabular-nums" aria-hidden>
            {pad(current.remaining)}
          </p>
          <p className={cn(label, 'mt-4')}>
            {current.reached ? `My ${selected}-month horizon is reached` : <><span className="sr-only">{current.remaining} </span>Days left to my {selected}-month self</>}
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:pb-1">
          <p className={label}>{phase} / {progress} / {String(counts[selected]).padStart(2, '0')} statements</p>
          <p className="max-w-xl text-[clamp(26px,3vw,40px)] leading-[1.15] tracking-tight text-text-primary">{identity}</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4">
          <StartControl key={runway.start} start={runway.start} today={today} />
          <span className={cn(label, 'flex items-center gap-3 text-text-disabled')}>
            {!finished && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-accent" />Now</span>}
            <span>1 dot = 1 week</span>
          </span>
        </div>
        <div aria-hidden className="grid gap-px sm:gap-[3px] lg:gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {Array.from({ length: weeks }, (_, week) => {
            const from = week * 7;
            const state = from + 7 <= elapsed || finished ? 'lived' : from <= elapsed ? 'now' : from < current.length ? 'ahead' : 'beyond';
            return (
              <span key={week} style={{ transitionDelay: `${week * 6}ms` }}
                className={cn('aspect-square rounded-full transition-colors duration-150 ease-out motion-reduce:transition-none', {
                  lived: 'bg-text-display', now: 'bg-accent', ahead: 'bg-text-disabled', beyond: 'bg-border-visible',
                }[state])} />
            );
          })}
        </div>
        <div className="relative mt-2 h-14" role="group" aria-label="Future self horizons">
          {spans.map(({ months, end, length, reached }) => {
            const active = months === selected;
            const last = months === FUTURE_HORIZONS[FUTURE_HORIZONS.length - 1];
            return (
              <button key={months} type="button" aria-pressed={active} aria-controls="self-image-list"
                aria-label={`${months} months: ${HORIZON_IDENTITY[months].phase}, ${reached ? 'reached' : 'by'} ${fullDate(end)}`}
                onClick={() => onSelect(months)} style={{ left: `${(length / total) * 100}%` }}
                className={cn('group absolute top-0 flex min-h-11 min-w-11 flex-col gap-1 whitespace-nowrap pt-1 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary',
                  last ? '-translate-x-full items-end border-r pr-2 text-right' : 'border-l pl-2 text-left',
                  active ? 'border-text-display' : 'border-border-visible')}>
                <span className={cn('font-mono text-[13px] uppercase tracking-[0.06em]', active ? 'text-text-display' : 'text-text-secondary group-hover:text-text-primary')}>
                  {String(months).padStart(2, '0')} mo{reached && ' / done'}
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

function StartControl({ start, today }: { start: string; today: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(start);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <Button variant="ghost" onClick={() => setEditing(true)} aria-label={`Started ${fullDate(start)}. Change start date`}
        className={cn(mono, '-ml-3 text-text-secondary hover:text-text-primary')}>
        Started {fullDate(start)} <Pencil data-icon="inline-end" className="size-3" />
      </Button>
    );
  }
  return (
    <form className="flex flex-wrap items-center gap-1" onSubmit={(event) => {
      event.preventDefault();
      setError('');
      startTransition(async () => {
        try {
          const result = await setFutureSelfStart(draft);
          if ('error' in result) setError(result.error); else setEditing(false);
        } catch { setError('Connection lost. Try again.'); }
      });
    }}>
      <label className="flex items-center gap-2">
        <span className={label}>Started on</span>
        <input type="date" required max={today} value={draft} disabled={pending} onChange={(event) => setDraft(event.target.value)}
          className="min-h-11 border-b border-border-visible bg-transparent font-mono text-[13px] text-text-primary outline-none focus:border-text-primary" />
      </label>
      <Button type="submit" disabled={pending || !draft} className={mono}>{pending ? '[ Saving… ]' : 'Save'}</Button>
      <Button type="button" variant="ghost" disabled={pending} className={mono} onClick={() => { setDraft(start); setEditing(false); setError(''); }}>Cancel</Button>
      {error && <span role="status" className={cn(label, 'text-accent')}>[ERROR: {error}]</span>}
    </form>
  );
}
