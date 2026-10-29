'use client';

import { createContext, startTransition, useCallback, useContext, useMemo, useOptimistic, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setProgress } from '@/lib/actions/roadmap';
import { monoSm } from './ui';

type Ctx = { done: ReadonlySet<string>; toggle: (key: string) => void };
const ProgressContext = createContext<Ctx | null>(null);

export function useProgress(): Ctx {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}

/** Server actions can throw on network loss; keep the UI honest either way. */
async function save(key: string, done: boolean): Promise<string | null> {
  try {
    const r = await setProgress(key, done);
    return 'error' in r ? r.error : null;
  } catch {
    return 'Connection lost. Try again.';
  }
}

/** Holds the user's completed keys; ticks apply instantly and roll back if the save fails. */
export function ProgressProvider({ initial, children }: { initial: string[]; children: ReactNode }) {
  const base = useMemo<ReadonlySet<string>>(() => new Set(initial), [initial]);
  const [done, applyOptimistic] = useOptimistic(base, (cur, change: { key: string; on: boolean }) => {
    const next = new Set(cur);
    if (change.on) next.add(change.key);
    else next.delete(change.key);
    return next;
  });
  const [error, setError] = useState('');

  const toggle = useCallback(
    (key: string) => {
      const on = !done.has(key);
      setError('');
      startTransition(async () => {
        applyOptimistic({ key, on });
        const failed = await save(key, on);
        if (failed) setError(`[ERROR: ${failed}]`);
      });
    },
    [done, applyOptimistic],
  );

  const value = useMemo(() => ({ done, toggle }), [done, toggle]);
  return (
    <ProgressContext.Provider value={value}>
      {error && <p role="alert" className={cn(monoSm, 'rounded-lg border border-border-visible bg-surface px-4 py-3 text-text-primary')}>{error}</p>}
      {children}
    </ProgressContext.Provider>
  );
}

/** 28px hit area around an 18px box. */
export function CheckToggle({ progressKey, label }: { progressKey: string; label: string }) {
  const { done, toggle } = useProgress();
  const on = done.has(progressKey);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={() => toggle(progressKey)}
      className="group flex size-7 shrink-0 items-center justify-center"
    >
      <span
        className={cn(
          'flex size-[18px] items-center justify-center rounded-sm border transition-colors duration-200 ease-out motion-reduce:transition-none',
          on ? 'border-text-display bg-text-display text-background' : 'border-border-visible group-hover:border-text-secondary',
        )}
      >
        {on && <Check size={12} strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}
