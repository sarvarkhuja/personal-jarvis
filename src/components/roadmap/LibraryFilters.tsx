'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NOTE_KINDS } from '@/lib/domain/roadmap';
import type { LibraryParams } from '@/lib/domain/roadmap-library';

const GROUPS = ['topic', 'kind', 'confidence', 'none'] as const;
const SORTS = ['weakest', 'newest', 'oldest'] as const;
const CONFS = [1, 2, 3] as const;

const label = 'font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled';
const chip = 'inline-flex min-h-6 items-center rounded-full border px-3 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors duration-200 ease-out motion-reduce:transition-none';

export function LibraryFilters({ params, topics }: {
  params: LibraryParams; topics: { slug: string; count: number }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(params.q ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const build = (next: URLSearchParams) => (next.toString() ? `${pathname}?${next.toString()}` : pathname);
  /** Set key=value; if it is already the active value (or value is null), remove it. */
  const hrefFor = (key: string, value: string | null, active = false) => {
    const next = new URLSearchParams(sp.toString());
    if (value === null || active) next.delete(key);
    else next.set(key, value);
    return build(next);
  };

  const onSearch = (value: string) => {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      const trimmed = value.trim();
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      router.replace(build(next));
    }, 300);
  };

  const Chip = ({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) => (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(chip, active
        ? 'border-text-display bg-text-display text-background'
        : 'border-border-visible text-text-secondary hover:text-text-primary')}
    >
      {children}
    </Link>
  );

  const row = (name: string, children: React.ReactNode) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn(label, 'w-12')}>{name}</span>
      {children}
    </div>
  );

  return (
    <div className="space-y-3" data-testid="library-filters">
      {row('GROUP', GROUPS.map((g) => (
        <Chip key={g} href={hrefFor('group', g)} active={params.group === g}>{g}</Chip>
      )))}
      {row('SORT', SORTS.map((s) => (
        <Chip key={s} href={hrefFor('sort', s)} active={params.sort === s}>{s}</Chip>
      )))}
      {row('KIND', NOTE_KINDS.map((k) => (
        <Chip key={k.key} href={hrefFor('kind', k.key, params.kind === k.key)} active={params.kind === k.key}>
          {k.key}
        </Chip>
      )))}
      {row('CONF', CONFS.map((c) => (
        <Chip key={c} href={hrefFor('conf', String(c), params.conf === c)} active={params.conf === c}>{c}</Chip>
      )))}
      {topics.length > 0 && row('TOPIC', topics.map((t) => (
        <Chip key={t.slug} href={hrefFor('topic', t.slug, params.topic === t.slug)} active={params.topic === t.slug}>
          {t.slug} <span className="ml-1 text-text-disabled">{t.count}</span>
        </Chip>
      )))}
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
          className="min-h-8 w-full max-w-xs rounded-md border border-border-visible bg-transparent px-3 font-mono text-[12px] text-text-primary placeholder:text-text-disabled focus:border-text-primary focus:outline-none"
        />
        <Link
          href={pathname}
          className="inline-flex min-h-6 items-center px-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
        >
          CLEAR
        </Link>
      </div>
    </div>
  );
}
