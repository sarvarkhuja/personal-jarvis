'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { countDone } from '@/lib/domain/roadmap';
import { WidgetCount } from '@/components/today/WidgetCard';
import { InlineMd } from './InlineMd';
import { CheckToggle, useProgress } from './ProgressProvider';
import { TrackTag, monoSm } from './ui';

export type ExerciseRow = {
  key: string;
  track: 'go' | 'ai' | 'ml';
  hours: number;
  task: string;
  verification: string;
  artifact: string;
};

export function DoneCount({ keys }: { keys: string[] }) {
  const { done } = useProgress();
  return <WidgetCount>{countDone(keys, done)}/{keys.length}</WidgetCount>;
}

export function ExerciseList({ rows }: { rows: ExerciseRow[] }) {
  const { done } = useProgress();
  return (
    <ol>
      {rows.map((r, i) => (
        <li key={r.key} className="border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0">
          <div className="flex items-center gap-3">
            <span className={cn(monoSm, 'text-text-disabled')}>{String(i + 1).padStart(2, '0')}</span>
            <TrackTag track={r.track} />
            <span className={cn(monoSm, 'text-text-secondary')}>{r.hours}H</span>
            <span className="ml-auto"><CheckToggle progressKey={r.key} label={`Done: ${r.task}`} /></span>
          </div>
          <p className={cn('mt-2 text-sm leading-relaxed', done.has(r.key) ? 'text-text-secondary' : 'text-text-primary')}>
            <InlineMd text={r.task} />
          </p>
          <details className="group mt-1">
            <summary className={cn(monoSm, 'inline-flex min-h-6 cursor-pointer list-none items-center gap-1.5 before:content-["+"] group-open:before:content-["–"] text-text-secondary hover:text-text-primary')}>
              VERIFY &amp; ARTIFACT
            </summary>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary"><InlineMd text={r.verification} /></p>
            <code className="mt-2 inline-block rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-text-primary">{r.artifact}</code>
          </details>
        </li>
      ))}
    </ol>
  );
}

export function BuildPanel({ buildKey, hours, task, artifact, gates, stretch }: {
  buildKey: string;
  hours: number;
  task: string;
  artifact: string;
  gates: { key: string; text: string }[];
  stretch: { hours: string; task: string };
}) {
  const { done } = useProgress();
  return (
    <div>
      <div className="flex items-start gap-2">
        <CheckToggle progressKey={buildKey} label={`Done: integrated build`} />
        <div className="min-w-0 flex-1 pt-1">
          <p className={cn('text-sm leading-relaxed', done.has(buildKey) ? 'text-text-secondary' : 'text-text-primary')}>
            <InlineMd text={task} />
          </p>
          <p className={cn(monoSm, 'mt-2 text-text-disabled')}>{hours}H · <code className="normal-case">{artifact}</code></p>
        </div>
      </div>

      <p className={cn(monoSm, 'mt-5 mb-1 text-text-secondary')}>DEFINITION OF DONE</p>
      <ul>
        {gates.map((g) => (
          <li key={g.key} className="flex items-start gap-2">
            <CheckToggle progressKey={g.key} label={`Gate: ${g.text}`} />
            <p className={cn('pt-1 text-sm leading-relaxed', done.has(g.key) ? 'text-text-secondary' : 'text-text-primary')}>{g.text}</p>
          </li>
        ))}
      </ul>

      <details className="group mt-3">
        <summary className={cn(monoSm, 'inline-flex min-h-6 cursor-pointer list-none items-center gap-1.5 before:content-["+"] group-open:before:content-["–"] text-text-secondary hover:text-text-primary')}>
          OPTIONAL STRETCH · +{stretch.hours}H
        </summary>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{stretch.task} Not part of the 20-hour core.</p>
      </details>
    </div>
  );
}

export type CapstoneRow = {
  n: number;
  title: string;
  description: string;
  weeks: [number, number];
  criteria: { key: string; text: string }[];
  deferred: { feature: string; week: number }[];
};

export function CapstoneBody({ c, linkWeek }: { c: CapstoneRow; linkWeek?: boolean }) {
  const { done } = useProgress();
  return (
    <div>
      <h3 className="text-lg leading-snug tracking-tight text-text-display">{c.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{c.description}</p>
      <ul className="mt-4">
        {c.criteria.map((g) => (
          <li key={g.key} className="flex items-start gap-2">
            <CheckToggle progressKey={g.key} label={`Capstone ${c.n}: ${g.text}`} />
            <p className={cn('pt-1 text-sm leading-relaxed', done.has(g.key) ? 'text-text-secondary' : 'text-text-primary')}>{g.text}</p>
          </li>
        ))}
      </ul>
      {c.deferred.length > 0 && (
        <details className="group mt-3">
          <summary className={cn(monoSm, 'inline-flex min-h-6 cursor-pointer list-none items-center gap-1.5 before:content-["+"] group-open:before:content-["–"] text-text-secondary hover:text-text-primary')}>
            DEFERRED · {c.deferred.length}
          </summary>
          <ul className="mt-1 space-y-1">
            {c.deferred.map((d) => (
              <li key={d.feature} className="text-sm leading-relaxed text-text-secondary">
                <span className={cn(monoSm, 'mr-2 text-text-disabled')}>W{d.week}</span>{d.feature}
              </li>
            ))}
          </ul>
        </details>
      )}
      {linkWeek && (
        <Link href={`/roadmap?w=${c.weeks[0]}`} className={cn(monoSm, 'mt-4 inline-flex min-h-6 items-center text-text-disabled hover:text-text-primary')}>
          WEEKS {c.weeks[0]}–{c.weeks[1]} →
        </Link>
      )}
    </div>
  );
}

export type FoundationRow = { key: string; objective: string; selfCheck: string; week: number; required: boolean };

export function FoundationList({ rows }: { rows: FoundationRow[] }) {
  const { done } = useProgress();
  return (
    <ul>
      {rows.map((r) => (
        <li key={r.key} className="border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0">
          <div className="flex items-start gap-2">
            <CheckToggle progressKey={r.key} label={`Audit: ${r.objective}`} />
            <div className="min-w-0 flex-1 pt-1">
              <p className={cn('text-sm leading-relaxed', done.has(r.key) ? 'text-text-secondary' : 'text-text-primary')}>{r.objective}</p>
              <p className={cn(monoSm, 'mt-1 text-text-disabled')}>BY W{r.week}{r.required ? '' : ' · OPTIONAL'}</p>
              <details className="group mt-1">
                <summary className={cn(monoSm, 'inline-flex min-h-6 cursor-pointer list-none items-center gap-1.5 before:content-["+"] group-open:before:content-["–"] text-text-secondary hover:text-text-primary')}>
                  SELF-CHECK
                </summary>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{r.selfCheck}</p>
              </details>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
