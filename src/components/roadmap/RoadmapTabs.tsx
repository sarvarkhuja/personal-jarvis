import Link from 'next/link';

const TABS = [
  { value: 'week', label: 'Week', href: '/roadmap' },
  { value: 'capstones', label: 'Capstones', href: '/roadmap/capstones' },
  { value: 'resources', label: 'Resources', href: '/roadmap/resources' },
  { value: 'library', label: 'Notes', href: '/roadmap/library' },
] as const;

/** Segmented link row (GoalsFilter recipe). */
export function RoadmapTabs({ active }: { active: (typeof TABS)[number]['value'] }) {
  return (
    <div className="inline-flex flex-wrap items-center rounded-full border border-border-visible p-0.5" data-testid="roadmap-tabs">
      {TABS.map((t) => (
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
