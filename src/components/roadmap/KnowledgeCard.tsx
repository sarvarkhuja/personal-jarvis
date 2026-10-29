'use client';

import { cn } from '@/lib/utils';
import { countDone } from '@/lib/domain/roadmap';
import { CheckToggle, useProgress } from './ProgressProvider';
import { WidgetCount } from '@/components/today/WidgetCard';
import { monoSm } from './ui';

export type KnowledgeRow = {
  key: string;
  objective: string;
  selfCheck: string;
  level: 'foundation' | 'intermediate' | 'senior';
  required: boolean;
};

const LEVEL = { foundation: 'Foundation', intermediate: 'Mid-level', senior: 'Senior' } as const;

function Row({ r }: { r: KnowledgeRow }) {
  const { done, toggle } = useProgress();
  const on = done.has(r.key);
  return (
    <li className="border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-start gap-2">
        <CheckToggle progressKey={r.key} label={`Known: ${r.objective}`} />
        <div className="min-w-0 flex-1 pt-1">
          {/* Mouse shortcut for the checkbox; keyboard and screen-reader users use the button. */}
          <p
            onClick={() => toggle(r.key)}
            className={cn('cursor-pointer text-sm leading-relaxed', on ? 'text-text-secondary' : 'text-text-primary')}
          >
            {r.objective}
          </p>
          <details className="group mt-1">
            <summary className={cn(monoSm, 'inline-flex min-h-6 cursor-pointer list-none items-center gap-1.5 before:content-["+"] group-open:before:content-["–"] text-text-secondary hover:text-text-primary')}>
              Self-check · {LEVEL[r.level].toLowerCase()}
            </summary>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{r.selfCheck}</p>
          </details>
        </div>
      </div>
    </li>
  );
}

/** One track's concepts: tick when you can answer the self-check without notes. Senior stretch folds away. */
export function KnowledgeList({ rows }: { rows: KnowledgeRow[] }) {
  const { done } = useProgress();
  const core = rows.filter((r) => r.required);
  const stretch = rows.filter((r) => !r.required);
  return (
    <>
      <ul>{core.map((r) => <Row key={r.key} r={r} />)}</ul>
      {stretch.length > 0 && (
        <details className="group mt-4 border-t border-border pt-3">
          <summary className={cn(monoSm, 'inline-flex min-h-6 cursor-pointer list-none items-center gap-1.5 before:content-["+"] group-open:before:content-["–"] text-text-secondary hover:text-text-primary')}>
            Senior stretch · {countDone(stretch.map((r) => r.key), done)}/{stretch.length} · optional
          </summary>
          <ul className="mt-3">{stretch.map((r) => <Row key={r.key} r={r} />)}</ul>
        </details>
      )}
    </>
  );
}

export function KnowledgeCount({ keys }: { keys: string[] }) {
  const { done } = useProgress();
  return <WidgetCount>{countDone(keys, done)}/{keys.length}</WidgetCount>;
}
