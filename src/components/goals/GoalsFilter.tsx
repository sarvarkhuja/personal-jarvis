'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'all', label: 'All' },
] as const;

export function GoalsFilter() {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get('status') ?? 'active';

  return (
    <div
      className="inline-flex items-center rounded-full border border-border-visible p-0.5"
      data-testid="goals-filter"
    >
      {FILTERS.map((f) => {
        const sp = new URLSearchParams(params.toString());
        if (f.value === 'active') {
          sp.delete('status');
        } else {
          sp.set('status', f.value);
        }
        const href = sp.toString() ? `${pathname}?${sp.toString()}` : pathname;
        const active = current === f.value || (f.value === 'active' && !params.get('status'));
        return (
          <Link
            key={f.value}
            href={href}
            aria-current={active ? 'true' : undefined}
            className={
              'rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors duration-200 ease-out motion-reduce:transition-none ' +
              (active
                ? 'bg-text-display text-background'
                : 'text-text-secondary hover:text-text-primary')
            }
            data-testid={`goals-filter-${f.value}`}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
}
