'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FocusConsole, type FocusConsoleProps } from '@/components/focus/FocusConsole';
import { HorizonRunway } from '@/components/home/HorizonRunway';
import { SelfImageList } from '@/components/home/SelfImageList';
import { cn } from '@/lib/utils';
import { FUTURE_HORIZONS, buildRunway, type AttentionEvidence } from '@/lib/domain/future-self';
import type { SelfImageItem, SelfImageMonths } from '@/lib/schemas/self-images';

const label = 'font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary';

export function FutureSelf({ items, today, startedOn, evidence, evidenceAvailable, itemsAvailable, goal, focusOptions }: {
  items: SelfImageItem[];
  today: string;
  /** Day the runway counts from (profiles.future_self_started_on). */
  startedOn: string;
  evidence: AttentionEvidence;
  evidenceAvailable: boolean;
  itemsAvailable: boolean;
  goal?: { id: string; title: string };
  focusOptions: Pick<FocusConsoleProps, 'goalOptions' | 'habitOptions'>;
}) {
  const [selected, setSelected] = useState<SelfImageMonths>(2);
  const counts = Object.fromEntries(FUTURE_HORIZONS.map((months) => [months, items.filter((item) => item.months === months).length])) as Record<SelfImageMonths, number>;
  const nextAction = goal ? `Take the next small step on: ${goal.title}` : 'Open my plan and finish one small, useful task';
  const recoveryUrl = `/focus?${new URLSearchParams({ minutes: '5', intent: nextAction.slice(0, 280), ...(goal ? { goal: goal.id } : {}) })}`;

  return (
    <section aria-labelledby="future-self-title" className="flex flex-col gap-16 py-8 md:gap-24">
      <div>
        <h2 id="future-self-title" className={cn(label, 'mb-10 md:mb-14')}>[ Future self / built daily ]</h2>
        <HorizonRunway runway={buildRunway(startedOn, today)} today={today} selected={selected} onSelect={setSelected} counts={counts} />
      </div>

      <SelfImageList items={items} months={selected} available={itemsAvailable} />

      <div className="grid gap-12 border-t border-border-visible pt-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
        <section aria-labelledby="home-focus-session" className="min-w-0">
          <h3 id="home-focus-session" className={label}>[ Today / focus session ]</h3>
          <p className="mb-6 mt-4 max-w-lg text-base leading-relaxed text-text-primary">{nextAction}.</p>
          <FocusConsole {...focusOptions} layout="stacked" sessionDetails="bullets" initialGoalId={goal?.id ?? ''} />
          <Link href={recoveryUrl} className="mt-3 inline-flex min-h-11 items-center text-sm text-text-secondary underline underline-offset-4 hover:text-text-primary">
            Hard day? Restart with 5 minutes.
          </Link>
        </section>

        <section aria-labelledby="attention-evidence">
          <h3 id="attention-evidence" className={label}>[ Last 14 days / evidence ]</h3>
          {evidenceAvailable ? <>
            <div className="mt-6 flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-5xl tracking-tighter text-text-display tabular-nums">{String(evidence.activeDays).padStart(2, '0')}</span>
              <span className={label}>/ 14 days with focus</span>
            </div>
            <div className="mt-6 flex gap-1" aria-label="Focus minutes on each of the previous 14 days">
              {evidence.days.map((day) => <div key={day.date} title={`${day.date}: ${day.minutes} minutes logged`} className="flex h-16 flex-1 items-end bg-surface-raised">
                <span className="w-full bg-text-display" style={{ height: `${Math.min(100, day.minutes / 25 * 100)}%` }} />
                <span className="sr-only">{day.date}: {day.minutes} minutes.</span>
              </div>)}
            </div>
            <div className={cn(label, 'mt-2 flex justify-between gap-3 text-text-disabled')}><span>14 days ago</span><span>Full bar = 25 min</span></div>
            <dl className="mt-8">
              {[
                ['Invested', `${Math.round(evidence.totalMinutes)} min`],
                ['Daily average', `${Math.round(evidence.dailyAverage)} min`],
                ['Today', `${Math.round(evidence.todayMinutes)} min${evidence.todayMinutes >= 25 ? ' / promise kept' : ''}`],
              ].map(([term, value]) => (
                <div key={term} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
                  <dt className={label}>{term}</dt>
                  <dd className="font-mono text-sm text-text-primary tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {evidence.totalMinutes > 0 ? 'An empty day means no focus was logged, not that you did nothing.' : 'Your starting line. Finish one focus session to start collecting evidence.'}
            </p>
          </> : <p role="status" className="mt-6 text-sm text-text-secondary">Focus history is unavailable right now. Reload to see your recent pace.</p>}
        </section>
      </div>
    </section>
  );
}
