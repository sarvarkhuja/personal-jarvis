'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { countDone } from '@/lib/domain/roadmap';
import { useProgress } from './ProgressProvider';
import { mono } from './ui';

import type { WeekTab } from './WeekWorkspace';

/** Week title plus the tab bar. Concept and practice tabs show live counts. */
export function WeekHeader({ week, monthName, goal, hours, tab, onTab, knowKeys, practiceKeys, readingCount, noteCount }: {
  week: number;
  monthName: string;
  goal: string;
  hours: number;
  tab: WeekTab;
  onTab: (t: WeekTab) => void;
  knowKeys: string[];
  practiceKeys: string[];
  readingCount: number;
  noteCount: number;
}) {
  const { done } = useProgress();
  const tabs: { id: WeekTab; label: string; count: string }[] = [
    { id: 'concepts', label: 'Concepts', count: `${countDone(knowKeys, done)}/${knowKeys.length}` },
    { id: 'practice', label: 'Practice', count: `${countDone(practiceKeys, done)}/${practiceKeys.length}` },
    { id: 'reading', label: 'Reading', count: String(readingCount) },
    { id: 'notes', label: 'Notes', count: String(noteCount) },
  ];
  return (
    <section aria-label={`Week ${week}`} className="rounded-lg border border-border bg-surface p-6">
      <div className={cn(mono, 'flex items-baseline justify-between gap-3 text-text-secondary')}>
        <span>{monthName} · week {week} of 28</span>
        <span>{hours}h core</span>
      </div>
      <h2 className="mt-3 max-w-[60ch] text-2xl leading-tight tracking-tight text-text-display">{goal.replace(/\.$/, '')}</h2>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Week sections" className="inline-flex flex-wrap items-center rounded-full border border-border-visible p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`week-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`week-panel-${t.id}`}
              onClick={() => onTab(t.id)}
              className={cn(
                'inline-flex min-h-8 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-200 motion-reduce:transition-none',
                tab === t.id ? 'bg-text-display text-background' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {t.label}
              <span className="font-mono text-[10px] tabular-nums opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {week > 1 && (
            <Link href={`/roadmap?w=${week - 1}&t=${tab}`} scroll={false} aria-label={`Previous week, week ${week - 1}`} className="inline-flex min-h-8 items-center rounded-full px-3 font-mono text-[11px] text-text-secondary hover:text-text-primary">← W{week - 1}</Link>
          )}
          {week < 28 && (
            <Link href={`/roadmap?w=${week + 1}&t=${tab}`} scroll={false} aria-label={`Next week, week ${week + 1}`} className="inline-flex min-h-8 items-center rounded-full px-3 font-mono text-[11px] text-text-secondary hover:text-text-primary">W{week + 1} →</Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** Closing line under each tab: what is left, or the way into the next week. */
export function WeekFooter({ week, coreKeys }: { week: number; coreKeys: string[] }) {
  const { done } = useProgress();
  const left = coreKeys.length - countDone(coreKeys, done);
  if (left > 0) {
    return <p className={cn(mono, 'text-text-disabled')}>{left} core checkpoint{left === 1 ? '' : 's'} left in week {week}</p>;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/40 bg-surface p-5">
      <p className="text-base text-text-primary">Week {week} is clear.</p>
      {week < 28 && (
        <Link href={`/roadmap?w=${week + 1}`} className="inline-flex min-h-10 items-center rounded-full bg-text-display px-5 font-mono text-[12px] uppercase tracking-[0.08em] text-background">
          Start week {week + 1}
        </Link>
      )}
    </div>
  );
}
