import { cn } from '@/lib/utils';

export const mono = 'font-mono text-[11px] uppercase tracking-[0.08em]';
export const monoSm = 'font-mono text-[10px] uppercase tracking-[0.08em]';

export const TRACK_LABEL = { go: 'GO / SYSTEMS', ai: 'AI PLATFORM', ml: 'ML RUNTIME' } as const;
export const TRACK_SHORT = { go: 'GO', ai: 'AI', ml: 'ML' } as const;

/** Segmented 1px rail with a count; the Nothing "meter" used across the roadmap. */
export function Meter({ label, done, total, className }: { label: string; done: number; total: number; className?: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className={className}>
      <div className={cn(monoSm, 'flex items-baseline justify-between gap-3 text-text-secondary')}>
        <span>{label}</span>
        <span className="tabular-nums text-text-primary">{done}/{total}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-2 h-1 overflow-hidden rounded-full bg-border-visible"
      >
        <div className="h-full bg-text-display transition-[width] duration-200 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TrackTag({ track }: { track: keyof typeof TRACK_SHORT }) {
  return (
    <span className={cn(monoSm, 'rounded-full border border-border-visible px-2 py-0.5 text-text-secondary')}>
      {TRACK_SHORT[track]}
    </span>
  );
}

/** Strips the "FOUNDATION · " style prefix; the level is shown as its own tag. */
export function stripLevel(objective: string): string {
  return objective.replace(/^(FOUNDATION|MID-LEVEL|SENIOR STRETCH) · /, '');
}
