'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { countDone, currentWeek } from '@/lib/domain/roadmap';
import { useProgress } from './ProgressProvider';
import { mono } from './ui';

const WEEKS = Array.from({ length: 28 }, (_, i) => i + 1);

export type NextUpView = { key: string; week: number; tab: string; kicker: string; text: string };

/** Overall count, the 28-week strip with named months, and one clear next step. */
export function RoadmapHero({ weekKeys, stretchKeys, months, selectedWeek, nextItems, pace, dots }: {
  weekKeys: string[][];
  stretchKeys: string[];
  months: string[];
  selectedWeek: number;
  nextItems: NextUpView[];
  pace: { perWeek: number; remaining: number; finishMonth: string };
  dots: boolean[];
}) {
  const { done } = useProgress();
  const total = weekKeys.reduce((n, k) => n + k.length, 0);
  const doneCount = weekKeys.reduce((n, k) => n + countDone(k, done), 0);
  const stretch = countDone(stretchKeys, done);
  const pct = Math.round((doneCount / total) * 100);
  const current = currentWeek(weekKeys, done);
  const next = nextItems.find((n) => !done.has(n.key)) ?? null;
  const selectedMonth = Math.ceil(selectedWeek / 4);

  return (
    <section aria-label="Roadmap progress" className="grid gap-8 rounded-lg border border-border bg-surface p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col justify-between gap-6">
        <div>
          <p className="font-doto text-[clamp(64px,10vw,120px)] leading-[0.85] tracking-[-0.02em] text-text-display tabular-nums">
            {String(doneCount).padStart(3, '0')}
          </p>
          <p className={cn(mono, 'mt-3 text-text-secondary')}>of {total} core checkpoints · {pct}%</p>
          <div
            role="progressbar"
            aria-label="Overall progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={doneCount}
            className="mt-3 h-1 max-w-md overflow-hidden rounded-full bg-border-visible"
          >
            <div className="h-full bg-text-display transition-[width] duration-200 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
          </div>
          {stretch > 0 && <p className={cn(mono, 'mt-2 text-text-disabled')}>+{stretch} senior stretch</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1" role="img" aria-label={`Active on ${dots.filter(Boolean).length} of the last 14 days`}>
            {dots.map((on, i) => (
              <span key={i} className={cn('size-1.5 rounded-full', on ? 'bg-text-display' : 'bg-border-visible')} />
            ))}
          </div>
          {pace.remaining > 0 && (
            <span className={cn(mono, 'text-text-disabled')}>≈ {pace.perWeek}/wk · done by {pace.finishMonth}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {next ? (
          <div className="rounded-lg border border-border-visible p-5">
            <p className={cn(mono, 'text-text-secondary')}>Next up · week {next.week} · {next.kicker.toLowerCase()}</p>
            <p className="mt-3 text-lg leading-snug tracking-tight text-text-primary">{next.text}</p>
            <Link
              href={`/roadmap?w=${next.week}&t=${next.tab}`}
              className="mt-4 inline-flex min-h-10 items-center rounded-full bg-text-display px-5 font-mono text-[12px] uppercase tracking-[0.08em] text-background transition-opacity duration-200 hover:opacity-90 motion-reduce:transition-none"
            >
              Continue week {next.week}
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-border-visible p-5">
            <p className="text-lg leading-snug tracking-tight text-text-primary">Every core checkpoint is done.</p>
            <p className="mt-2 text-sm text-text-secondary">Revisit weak concepts, or take on the senior stretch items.</p>
          </div>
        )}

        <div>
          <div className="grid grid-cols-7 gap-1 sm:grid-cols-14">
            {WEEKS.map((w) => {
              const keys = weekKeys[w - 1];
              const n = countDone(keys, done);
              const first = w === current;
              return (
                <Link
                  key={w}
                  href={`/roadmap?w=${w}`}
                  aria-label={`Week ${w}: ${n} of ${keys.length} done`}
                  aria-current={w === selectedWeek ? 'true' : undefined}
                  title={`Week ${w}`}
                  className={cn(
                    'relative flex min-h-7 min-w-6 items-end overflow-hidden rounded-sm border',
                    first ? 'border-accent bg-accent' : 'border-border-visible bg-background',
                    w === selectedWeek && 'outline outline-2 outline-offset-1 outline-text-primary',
                  )}
                >
                  {!first && n > 0 && (
                    <span aria-hidden className="absolute inset-x-0 bottom-0 bg-text-display" style={{ height: `${(n / keys.length) * 100}%` }} />
                  )}
                </Link>
              );
            })}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {months.map((m, i) => (
              <li key={m}>
                <Link
                  href={`/roadmap?w=${i * 4 + 1}`}
                  aria-current={selectedMonth === i + 1 ? 'true' : undefined}
                  className={cn(
                    'inline-flex min-h-6 items-center font-mono text-[10px] tracking-[0.04em] transition-colors duration-200 motion-reduce:transition-none',
                    selectedMonth === i + 1 ? 'text-text-primary' : 'text-text-disabled hover:text-text-secondary',
                  )}
                >
                  M{i + 1} {m}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
