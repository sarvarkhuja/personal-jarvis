'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { deleteRoadmapNote, updateRoadmapNote } from '@/lib/actions/roadmap';
import { NOTE_KINDS } from '@/lib/domain/roadmap';
import type { RoadmapNote } from '@/lib/domain/roadmap-library';
import { toUserDate } from '@/lib/domain/timezone';
import { formatUTCDate } from '@/lib/utils/workout-metrics';
import { NoteComposer } from './NoteComposer';

const mono = 'font-mono text-[10px] uppercase tracking-[0.08em]';
const btn = `${mono} inline-flex min-h-6 min-w-6 items-center justify-center px-1 text-text-disabled transition-colors duration-200 ease-out hover:text-text-primary disabled:opacity-40 motion-reduce:transition-none`;

type Result = { success: true } | { error: string };

/** Server actions can throw on network loss; keep the UI honest either way. */
async function run(action: () => Promise<Result>): Promise<Result> {
  try { return await action(); } catch { return { error: 'Connection lost. Try again.' }; }
}

export function NoteCard({ note, tz, known = [], footer }: {
  note: RoadmapNote; tz: string; known?: { slug: string; count: number }[]; footer?: React.ReactNode;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  if (mode === 'edit') {
    return (
      <div className="border-b border-border py-4 last:border-b-0">
        <NoteComposer week={note.week} known={known} initial={note} onDone={() => setMode('view')} />
      </div>
    );
  }

  const go = (next: 'view' | 'edit' | 'confirm') => { setError(''); setMode(next); };
  const act = (action: () => Promise<Result>) => {
    setError('');
    startTransition(async () => {
      const result = await run(action);
      if ('error' in result) setError(`[ERROR: ${result.error}]`);
      else setMode('view');
    });
  };
  const kindLabel = NOTE_KINDS.find((k) => k.key === note.kind)?.label ?? note.kind.toUpperCase();

  return (
    <article className={cn('border-b border-border py-4 last:border-b-0', pending && 'opacity-60')}>
      <div className={cn(mono, 'flex flex-wrap items-center gap-2 text-text-secondary')}>
        <span className="text-text-primary">{kindLabel}</span>
        <Link href={`/roadmap?w=${note.week}`} className="inline-flex min-h-6 min-w-6 items-center justify-center hover:text-text-primary">W{note.week}</Link>
        <span className="text-text-disabled">{formatUTCDate(toUserDate(note.created_at, tz), { day: 'numeric', month: 'short' })}</span>
        <div role="group" aria-label="Confidence" className="ml-auto flex items-center">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              disabled={pending}
              aria-label={`Confidence ${n}`}
              aria-pressed={note.confidence === n}
              onClick={() => { if (n !== note.confidence) act(() => updateRoadmapNote({ id: note.id, confidence: n })); }}
              className="inline-flex size-6 items-center justify-center"
            >
              <span className={cn('size-2.5 rounded-full border border-text-secondary', n <= note.confidence && 'bg-text-primary')} />
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-primary">{note.body}</p>
      {note.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.topics.map((t) => (
            <Link key={t} href={`/roadmap/library?topic=${encodeURIComponent(t)}`} className={cn(mono, 'inline-flex min-h-6 items-center rounded-full border border-border px-2 text-text-secondary hover:text-text-primary')}>
              {t}
            </Link>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {mode === 'confirm' ? (
          <div role="group" aria-label="Confirm delete" className="flex items-center gap-1">
            <span className={cn(mono, 'text-text-primary')}>Delete?</span>
            <button type="button" disabled={pending} className={btn} onClick={() => act(() => deleteRoadmapNote(note.id))}>Yes</button>
            <button type="button" disabled={pending} className={btn} onClick={() => go('view')}>No</button>
          </div>
        ) : (
          <>
            <button type="button" disabled={pending} className={btn} onClick={() => go('edit')}>EDIT</button>
            <button type="button" disabled={pending} className={btn} onClick={() => go('confirm')}>DELETE</button>
          </>
        )}
        {footer}
      </div>
      {error && <p role="alert" className={cn(mono, 'mt-2 text-text-primary')}>{error}</p>}
    </article>
  );
}
