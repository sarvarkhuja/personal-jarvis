'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createSelfImageItem, deleteSelfImageItem, loadSelfImageProtocol, updateSelfImageItem } from '@/lib/actions/self-images';
import { groupSelfImage, protocolItems } from '@/lib/domain/future-self';
import type { SelfImageItem, SelfImageMonths, SelfImagePillar } from '@/lib/schemas/self-images';

const label = 'font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary';
const control = 'min-h-11 rounded-full px-5 font-mono text-[11px] uppercase tracking-[0.06em]';
const mono = 'min-h-11 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.06em]';
const field = 'w-full resize-none rounded-md border border-border-visible bg-background p-3 text-sm leading-relaxed text-text-primary outline-none focus:border-text-primary';

type Result = { success: true } | { error: string };

export function SelfImageList({ items, months, available }: { items: SelfImageItem[]; months: SelfImageMonths; available: boolean }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState('');
  const groups = groupSelfImage(items, months);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const loadProtocol = () => {
    setStatus('');
    startTransition(async () => {
      const result = await run(() => loadSelfImageProtocol(months));
      setStatus('error' in result ? `[ERROR: ${result.error}]` : '[PROTOCOL LOADED]');
    });
  };

  return (
    <section id="self-image-list" aria-labelledby="self-image-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-visible pb-4">
        <h3 id="self-image-title" className={label}>[ Self-image / {months} months ]</h3>
        <p role="status" className={cn(label, status.startsWith('[ERROR') ? 'text-accent' : 'text-text-disabled')}>
          {status || `${String(total).padStart(2, '0')} statements I live by`}
        </p>
      </div>

      {!available && <p role="status" className="mt-6 text-sm text-text-secondary">Your self-image list is temporarily unavailable. Try reloading.</p>}
      {available && total === 0 && (
        <div className="flex flex-col items-start gap-4 py-12 md:py-16">
          <p className="max-w-md text-base leading-relaxed text-text-secondary">Nothing written for this horizon yet. Load the strict protocol and edit it, or add your own under any pillar.</p>
          <Button disabled={pending} className={control} onClick={loadProtocol}>
            {pending ? '[ Loading… ]' : `Load strict protocol / ${protocolItems(months).length}`}
          </Button>
        </div>
      )}

      <div className="mt-8 gap-x-16 lg:columns-2">
        {groups.map((group) => (
          <PillarList key={`${months}-${group.key}`} months={months} pillar={group.key} title={group.label} href={group.href} items={group.items} available={available} />
        ))}
      </div>
    </section>
  );
}

/** Server actions can throw on network loss; keep the UI honest either way. */
async function run(action: () => Promise<Result>): Promise<Result> {
  try { return await action(); } catch { return { error: 'Connection lost. Try again.' }; }
}

function PillarList({ months, pillar, title, href, items, available }: {
  months: SelfImageMonths; pillar: SelfImagePillar; title: string; href: string; items: SelfImageItem[]; available: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const headingId = `self-image-${pillar}`;
  return (
    <section aria-labelledby={headingId} className="mb-12 break-inside-avoid">
      <div className="flex items-baseline justify-between gap-4 border-b border-border-visible pb-3">
        <h4 id={headingId} className={label}>
          <Link href={href} className="inline-flex min-h-7 items-center gap-1 hover:text-text-primary">{title}<ArrowUpRight className="size-3" /></Link>
        </h4>
        <span className="font-mono text-[11px] text-text-disabled">{String(items.length).padStart(2, '0')}</span>
      </div>
      <ol>
        {items.map((item, index) => <ItemRow key={item.id} item={item} index={index} available={available} />)}
        {items.length === 0 && !adding && <li className={cn(label, 'border-b border-border py-4 text-text-disabled')}>— Nothing yet</li>}
      </ol>
      {adding
        ? <AddRow months={months} pillar={pillar} title={title} onDone={() => setAdding(false)} />
        : <Button variant="ghost" disabled={!available} onClick={() => setAdding(true)} className={cn(mono, '-ml-3 mt-1 text-text-secondary hover:text-text-primary')}>
            <Plus data-icon="inline-start" /> Add to {title}
          </Button>}
    </section>
  );
}

function ItemRow({ item, index, available }: { item: SelfImageItem; index: number; available: boolean }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view');
  const [draft, setDraft] = useState(item.body);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const act = (action: () => Promise<Result>, after: () => void) => {
    setError('');
    startTransition(async () => {
      const result = await run(action);
      if ('error' in result) setError(result.error); else after();
    });
  };
  const save = () => {
    if (draft.trim() === item.body) { setMode('view'); return; }
    act(() => updateSelfImageItem(item.id, draft), () => setMode('view'));
  };

  return (
    <li className={cn('grid grid-cols-[2rem_1fr_auto] items-start gap-x-3 border-b border-border py-3', pending && 'opacity-40')}>
      <span className="pt-0.5 font-mono text-[11px] leading-6 text-text-disabled">{String(index + 1).padStart(2, '0')}</span>
      {mode === 'edit' ? (
        <form className="col-span-2 flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <textarea aria-label="Edit statement" autoFocus rows={2} maxLength={280} value={draft} disabled={pending} className={field}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { setDraft(item.body); setMode('view'); setError(''); }
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); }
            }} />
          <div className="flex flex-wrap items-center gap-1">
            <Button type="submit" disabled={pending} className={mono}>{pending ? '[ Saving… ]' : 'Save'}</Button>
            <Button type="button" variant="ghost" disabled={pending} className={mono} onClick={() => { setDraft(item.body); setMode('view'); setError(''); }}>Cancel</Button>
            <span className="ml-auto font-mono text-[11px] text-text-disabled">{draft.length}/280</span>
          </div>
        </form>
      ) : (
        <>
          <p className="text-base leading-6 text-text-primary">{item.body}</p>
          {mode === 'confirm' ? (
            <div className="flex items-center gap-1" role="group" aria-label="Confirm delete">
              <span className={cn(label, 'text-accent')}>Delete?</span>
              <Button variant="ghost" disabled={pending} className={cn(mono, 'text-accent hover:text-accent')} onClick={() => act(() => deleteSelfImageItem(item.id), () => setMode('view'))}>Yes</Button>
              <Button variant="ghost" disabled={pending} className={mono} onClick={() => setMode('view')}>No</Button>
            </div>
          ) : (
            <div className="flex items-center">
              <Button variant="ghost" size="icon" disabled={!available} aria-label={`Edit: ${item.body}`} className="size-11 rounded-full text-text-disabled hover:text-text-primary" onClick={() => { setDraft(item.body); setMode('edit'); }}><Pencil /></Button>
              <Button variant="ghost" size="icon" disabled={!available} aria-label={`Delete: ${item.body}`} className="size-11 rounded-full text-text-disabled hover:text-accent" onClick={() => setMode('confirm')}><X /></Button>
            </div>
          )}
        </>
      )}
      {error && <p role="status" className={cn(label, 'col-start-2 col-end-4 mt-1 text-accent')}>[ERROR: {error}]</p>}
    </li>
  );
}

function AddRow({ months, pillar, title, onDone }: { months: SelfImageMonths; pillar: SelfImagePillar; title: string; onDone: () => void }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const submit = () => {
    setError('');
    startTransition(async () => {
      const result = await run(() => createSelfImageItem({ months, pillar, body: draft }));
      if ('error' in result) setError(result.error); else { setDraft(''); onDone(); }
    });
  };
  return (
    <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <textarea aria-label={`New ${title} statement`} autoFocus rows={2} maxLength={280} value={draft} disabled={pending} placeholder="I am someone who…" className={field}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onDone();
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); }
        }} />
      <div className="flex flex-wrap items-center gap-1">
        <Button type="submit" disabled={pending || !draft.trim()} className={mono}>{pending ? '[ Adding… ]' : 'Add'}</Button>
        <Button type="button" variant="ghost" disabled={pending} className={mono} onClick={onDone}>Cancel</Button>
        {error && <span role="status" className={cn(label, 'text-accent')}>[ERROR: {error}]</span>}
        <span className="ml-auto font-mono text-[11px] text-text-disabled">{draft.length}/280</span>
      </div>
    </form>
  );
}
