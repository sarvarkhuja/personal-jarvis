'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { setItemStatus } from '@/lib/actions/roadmap';
import { TRACKS, isRevised, itemText, type ItemStatus, type Track } from '@/lib/domain/roadmap';
import type { Capstone, RoadmapWeek } from '@/lib/domain/roadmap-parse';
import { InlineMd } from './InlineMd';

const mono = 'font-mono text-[10px] uppercase tracking-[0.08em]';
const btn = `${mono} min-h-6 px-1 text-text-disabled transition-colors duration-200 ease-out disabled:opacity-40 motion-reduce:transition-none`;

type Result = { success: true } | { error: string };

/** Server actions can throw on network loss; keep the UI honest either way. */
async function run(action: () => Promise<Result>): Promise<Result> {
  try { return await action(); } catch { return { error: 'Connection lost. Try again.' }; }
}

export function WeekItems({ week, statuses, capstone }: { week: RoadmapWeek; statuses: ItemStatus[]; capstone: Capstone | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const byTrack = new Map<Track, ItemStatus>(
    statuses.filter((s) => s.week === week.week).map((s) => [s.track, s]),
  );

  const toggle = (track: Track, target: 'done' | 'skipped') => {
    const next = byTrack.get(track)?.status === target ? null : target;
    setError('');
    startTransition(async () => {
      const result = await run(() => setItemStatus(week.week, track, next));
      if ('error' in result) setError(`[ERROR: ${result.error}]`);
    });
  };

  return (
    <div>
      <ul>
        {TRACKS.map(({ key, label }) => {
          const current = byTrack.get(key);
          return (
            <li key={key} className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
              <span className={cn(mono, 'w-24 shrink-0 pt-0.5 text-text-secondary')}>{label}</span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm leading-relaxed text-text-primary', current && 'text-text-secondary')}>
                  <InlineMd text={itemText(week.week, key)} />
                </p>
                {current && isRevised(current) && (
                  <span className={cn(mono, 'text-text-disabled')}>[ REVISED ]</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={pending}
                  aria-pressed={current?.status === 'done'}
                  aria-label={`Done ${label}`}
                  onClick={() => toggle(key, 'done')}
                  className={cn(btn, 'hover:text-success', current?.status === 'done' && 'text-success')}
                >
                  DONE
                </button>
                <button
                  type="button"
                  disabled={pending}
                  aria-pressed={current?.status === 'skipped'}
                  aria-label={`Skip ${label}`}
                  onClick={() => toggle(key, 'skipped')}
                  className={cn(btn, 'hover:text-text-primary', current?.status === 'skipped' && 'text-text-primary')}
                >
                  SKIP
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className={cn(mono, 'mt-3 text-text-primary')}>{error}</p>}
      {capstone && (
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-text-secondary">
          <span className={cn(mono, 'mr-2 text-text-primary')}>CAPSTONE {capstone.n}</span>
          {capstone.title}. {capstone.description}
        </p>
      )}
      <nav aria-label="Week navigation" className={cn(mono, 'mt-4 flex items-center justify-between text-text-disabled')}>
        {week.week > 1 ? (
          <Link href={`/roadmap?w=${week.week - 1}`} className="inline-flex min-h-6 items-center hover:text-text-primary">← W{week.week - 1}</Link>
        ) : <span />}
        {week.week < 28 ? (
          <Link href={`/roadmap?w=${week.week + 1}`} className="inline-flex min-h-6 items-center hover:text-text-primary">W{week.week + 1} →</Link>
        ) : <span />}
      </nav>
    </div>
  );
}
