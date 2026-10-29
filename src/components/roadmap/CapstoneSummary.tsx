'use client';

import { cn } from '@/lib/utils';
import { countDone } from '@/lib/domain/roadmap';
import { useProgress } from './ProgressProvider';
import { mono } from './ui';

/** Hero for the capstones page: verified milestones and audit coverage, live as you tick. */
export function CapstoneSummary({ capstoneKeys, foundationKeys }: {
  capstoneKeys: string[][];
  foundationKeys: string[];
}) {
  const { done } = useProgress();
  const verified = capstoneKeys.filter((k) => countDone(k, done) === k.length).length;
  const audit = countDone(foundationKeys, done);
  return (
    <section aria-label="Capstone progress" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
      <div className={cn(mono, 'text-text-secondary')}>[ MILESTONES VERIFIED ]</div>
      <p className="font-doto text-[clamp(64px,10vw,120px)] leading-[0.85] tracking-[-0.02em] text-text-display tabular-nums">
        {String(verified).padStart(2, '0')}
      </p>
      <p className={cn(mono, 'text-text-secondary')}>/{capstoneKeys.length} CAPSTONES · AUDIT {audit}/{foundationKeys.length}</p>
    </section>
  );
}
