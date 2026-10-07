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
    </section>
  );
}
