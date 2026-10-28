import Link from 'next/link';

const TABS = [
  { value: 'week', label: 'Week', href: '/roadmap' },
  { value: 'library', label: 'Library', href: '/roadmap/library' },
  { value: 'review', label: 'Review', href: '/roadmap/review' },
] as const;

/** Segmented link row (GoalsFilter recipe). The Review tab joins in a later task. */
export function RoadmapTabs({ active }: { active: 'week' | 'library' | 'review' }) {
  const tabs = TABS.filter((t) => t.value !== 'review' || active === 'review');
  return (
    <div className="inline-flex items-center rounded-full border border-border-visible p-0.5" data-testid="roadmap-tabs">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          aria-current={active === t.value ? 'page' : undefined}
          className={
            'rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors duration-200 ease-out motion-reduce:transition-none ' +
            (active === t.value ? 'bg-text-display text-background' : 'text-text-secondary hover:text-text-primary')
          }
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
