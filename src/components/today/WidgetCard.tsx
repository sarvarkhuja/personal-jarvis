import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * A single masonry widget card — the Nothing surface shared by every Today
 * widget. Kept whole within a CSS column (`break-inside-avoid`). Title is a
 * Space Mono bracket label; `right` holds an optional count and/or link.
 */
export function WidgetCard({
  title,
  right,
  children,
  testid,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  testid?: string;
}) {
  return (
    <section
      data-testid={testid}
      className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6"
    >
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {title}
        </h2>
        {right && (
          <div className="flex shrink-0 items-baseline gap-3">{right}</div>
        )}
      </header>
      {children}
    </section>
  );
}

/** Small mono count shown at a card's header-right. */
export function WidgetCount({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
      {children}
    </span>
  );
}

/** A quiet "→" link to the full surface for this widget. */
export function WidgetLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled transition-colors hover:text-text-primary"
    >
      {children} →
    </Link>
  );
}

/** Mono caps empty-state line — no emoji, no illustration. */
export function WidgetEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
      {children}
    </p>
  );
}
