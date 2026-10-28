'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { createRoadmapNote, updateRoadmapNote } from '@/lib/actions/roadmap';
import { NOTE_KINDS, TRACKS, normalizeTopic, suggestTopics, type NoteKind, type Track } from '@/lib/domain/roadmap';
import type { RoadmapNote } from '@/lib/domain/roadmap-library';

const mono = 'font-mono text-[10px] uppercase tracking-[0.08em]';
const btn = `${mono} inline-flex min-h-6 items-center px-2 transition-colors duration-200 ease-out disabled:opacity-40 motion-reduce:transition-none`;
const field = 'w-full resize-none rounded-md border border-border-visible bg-background p-3 text-sm leading-relaxed text-text-primary outline-none focus:border-text-primary';

type Result = { success: true } | { success: true; id: string } | { error: string };

/** Server actions can throw on network loss; keep the UI honest either way. */
async function run(action: () => Promise<Result>): Promise<Result> {
  try { return await action(); } catch { return { error: 'Connection lost. Try again.' }; }
}

export function NoteComposer({ week, known, initial, onDone }: {
  week: number;
  known: { slug: string; count: number }[];
  initial?: RoadmapNote;
  onDone?: () => void;
}) {
  const listId = useId();
  const [kind, setKind] = useState<NoteKind>(initial?.kind ?? 'learning');
  const [confidence, setConfidence] = useState<1 | 2 | 3>(initial?.confidence ?? 2);
  const [track, setTrack] = useState<Track | null>(initial?.track ?? null);
  const [body, setBody] = useState(initial?.body ?? '');
  const [topics, setTopics] = useState<string[]>(initial?.topics ?? []);
  const [topicDraft, setTopicDraft] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const full = topics.length >= 8;
  useEffect(() => { if (saved && !pending) bodyRef.current?.focus(); }, [saved, pending]);

  const addTopic = (raw: string) => {
    if (full) return;
    const slug = normalizeTopic(raw);
    if (slug && !topics.includes(slug)) setTopics([...topics, slug]);
    setTopicDraft('');
  };
  const suggestions = suggestTopics(week).filter((s) => !topics.includes(s)).slice(0, 6);

  const submit = () => {
    if (pending || !body.trim()) return;
    const slug = normalizeTopic(topicDraft);
    const finalTopics = slug && !topics.includes(slug) && topics.length < 8 ? [...topics, slug] : topics;
    setError('');
    setSaved(false);
    startTransition(async () => {
      const result = await run(() => initial
        ? updateRoadmapNote({ id: initial.id, week, kind, confidence, body, topics: finalTopics, track })
        : createRoadmapNote({ week, kind, confidence, body, topics: finalTopics, track }));
      if ('error' in result) { setError(`[ERROR: ${result.error}]`); return; }
      if (initial) { onDone?.(); return; }
      setBody('');
      setTopics([]);
      setTopicDraft('');
      setKind('learning');
      setConfidence(2);
      setTrack(null);
      setSaved(true);
    });
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <div role="group" aria-label="Kind" className="flex flex-wrap gap-1">
        {NOTE_KINDS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={kind === key}
            onClick={() => setKind(key)}
            className={cn(btn, 'rounded-full border border-border text-text-disabled hover:text-text-primary', kind === key && 'border-text-primary text-text-primary')}
          >
            {label}
          </button>
        ))}
      </div>

      <textarea
        ref={bodyRef}
        aria-label="Note"
        rows={4}
        maxLength={4000}
        value={body}
        disabled={pending}
        placeholder="What did you learn?"
        className={field}
        onChange={(event) => { setBody(event.target.value); setSaved(false); }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); }
        }}
      />

      <div className="flex flex-wrap items-center gap-1">
        {topics.map((t) => (
          <span key={t} className={cn(mono, 'inline-flex items-center rounded-full border border-border pl-2 text-text-secondary')}>
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => setTopics(topics.filter((x) => x !== t))}
              className="inline-flex size-6 items-center justify-center text-text-disabled hover:text-text-primary"
            >
              ×
            </button>
          </span>
        ))}
        <input
          aria-label="Topic"
          list={listId}
          value={topicDraft}
          disabled={pending || full}
          placeholder="Add topic"
          className="min-h-6 min-w-24 flex-1 bg-transparent font-mono text-[11px] text-text-primary outline-none placeholder:text-text-disabled"
          onChange={(event) => setTopicDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); addTopic(topicDraft); }
          }}
        />
        <datalist id={listId}>
          {known.map((k) => <option key={k.slug} value={k.slug} />)}
        </datalist>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1" aria-label="Suggested topics" role="group">
          {suggestions.map((s) => (
            <button key={s} type="button" disabled={full} onClick={() => addTopic(s)} className={cn(btn, 'text-text-disabled hover:text-text-primary')}>
              + {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Confidence" className="flex items-center">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Confidence ${n}`}
              aria-pressed={confidence === n}
              onClick={() => setConfidence(n)}
              className="inline-flex size-6 items-center justify-center"
            >
              <span className={cn('size-2.5 rounded-full border border-text-secondary', n <= confidence && 'bg-text-primary')} />
            </button>
          ))}
        </div>
        <select
          aria-label="Track"
          value={track ?? ''}
          disabled={pending}
          onChange={(event) => setTrack(event.target.value === '' ? null : (event.target.value as Track))}
          className={cn(mono, 'min-h-6 rounded-md border border-border bg-background px-1 text-text-secondary')}
        >
          <option value="">NO TRACK</option>
          {TRACKS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
        </select>
        <span className={cn(mono, 'ml-auto text-text-disabled')}>{body.length}/4000</span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button type="submit" disabled={pending || !body.trim()} className={cn(btn, 'rounded-full border border-text-primary text-text-primary')}>
          {pending ? '[ SAVING… ]' : 'SAVE'}
        </button>
        {initial && (
          <button type="button" disabled={pending} onClick={() => onDone?.()} className={cn(btn, 'text-text-disabled hover:text-text-primary')}>
            CANCEL
          </button>
        )}
        {saved && <span role="status" className={cn(mono, 'text-text-secondary')}>[ SAVED ]</span>}
      </div>
      {error && <p role="alert" className={cn(mono, 'text-text-primary')}>{error}</p>}
    </form>
  );
}
