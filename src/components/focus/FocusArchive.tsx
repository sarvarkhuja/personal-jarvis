import type { ReactNode } from 'react';
import type { FocusMetrics } from '@/lib/utils/focus-metrics';

/** Minutes → compact human duration. "—" for empty. */
function fmtMin(min: number): string {
  const m = Math.round(min);
  if (m <= 0) return '—';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

function fmtDayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    .toUpperCase();
}

const TIER_BG = [
  '', // tier 0 handled separately (hollow)
  'bg-text-primary/20',
  'bg-text-primary/40',
  'bg-text-primary/70',
  'bg-text-primary',
] as const;

/**
 * The archive — a full-width masonry of monochrome read-outs derived from the
 * focus-session history. Strictly supporting context: no display-size type,
 * no accent except the single 'ABORT' tag in the log.
 */
export function FocusArchive({ metrics }: { metrics: FocusMetrics }) {
  const { today, week, streak, rhythm, completion, where, log, totals } = metrics;
  const weekMax = Math.max(...week.bars.map((b) => b.min), 1);
  const C = 2 * Math.PI * 42; // arc circumference for r=42

  return (
    <div className="gap-4 md:columns-2 xl:columns-3">
      {/* ── TODAY ─────────────────────────────────────────────────────────── */}
      <Card title="[ TODAY ]">
        <div className="mb-6 flex items-baseline gap-2">
          <span className="font-mono text-3xl tabular-nums leading-none text-text-primary">
            {fmtMin(today.focusedMin)}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
            focused
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Sessions" value={String(today.sessions)} />
          <Stat
            label="Kept"
            value={today.endedCount ? `${today.kept}/${today.endedCount}` : '—'}
          />
          <Stat label="Longest" value={fmtMin(today.longestMin)} />
        </div>
      </Card>

      {/* ── THIS WEEK ─────────────────────────────────────────────────────── */}
      <Card title="[ THIS WEEK ]">
        <div className="relative flex h-16 items-end gap-2">
          {/* daily-average baseline */}
          {week.avgMin > 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border-visible"
              style={{ bottom: `${Math.min(100, (week.avgMin / weekMax) * 100)}%` }}
            />
          )}
          {week.bars.map((b) => (
            <div key={b.label} className="flex h-full flex-1 items-end">
              <div
                className={b.isToday ? 'w-full bg-text-primary' : 'w-full bg-border'}
                style={{ height: `${Math.max(3, (b.min / weekMax) * 100)}%` }}
                title={`${b.label}: ${fmtMin(b.min)}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {week.bars.map((b) => (
            <div
              key={b.label}
              className={`flex-1 text-center font-mono text-[10px] uppercase tracking-[0.08em] ${
                b.isToday ? 'text-text-primary' : 'text-text-secondary'
              }`}
            >
              {b.label.slice(0, 1)}
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {fmtMin(week.totalMin)} this week · avg {fmtMin(week.avgMin)}/day
        </p>
      </Card>

      {/* ── STREAK ────────────────────────────────────────────────────────── */}
      <Card title="[ STREAK ]">
        <div className="mb-5 flex items-baseline gap-2">
          <span className="font-doto text-5xl font-bold leading-none tabular-nums text-text-primary">
            {streak.count}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            {streak.count === 1 ? 'day' : 'days'}
          </span>
        </div>
        <div className="flex gap-[3px]">
          {streak.last14.map((d) => (
            <div
              key={d.date}
              title={fmtDayLabel(d.date)}
              className={`h-3 flex-1 ${d.active ? 'bg-text-primary' : 'border border-border'}`}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
          last 14 days
        </p>
      </Card>

      {/* ── RHYTHM ────────────────────────────────────────────────────────── */}
      <Card title="[ RHYTHM ]">
        <div className="grid grid-cols-7 gap-[4px]">
          {rhythm.cells.map((c) => (
            <div
              key={c.date}
              title={`${fmtDayLabel(c.date)} · ${fmtMin(c.min)}`}
              className={`aspect-square ${
                c.tier === 0
                  ? c.future
                    ? 'border border-border/50'
                    : 'border border-border'
                  : TIER_BG[c.tier]
              }`}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
          last 5 weeks · {fmtMin(totals.totalMin)} total
        </p>
      </Card>

      {/* ── COMPLETION ────────────────────────────────────────────────────── */}
      <Card title="[ COMPLETION ]">
        <div className="flex items-center gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="8"
                style={{ stroke: 'var(--border-visible)' }}
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="8"
                strokeLinecap="butt"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - completion.rate)}
                style={{ stroke: 'var(--text-primary)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl tabular-nums text-text-primary">
                {Math.round(completion.rate * 100)}
                <span className="text-[11px] text-text-secondary">%</span>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-secondary">
                kept
              </span>
            </div>
          </div>
          <div className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.08em] text-text-secondary">
            <div className="text-text-primary">{completion.kept} kept</div>
            <div>{completion.aborted} aborted</div>
          </div>
        </div>
      </Card>

      {/* ── WHERE IT GOES ─────────────────────────────────────────────────── */}
      <Card title="[ WHERE IT GOES ]">
        {where.rows.length === 0 ? (
          <p className="py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            No completed sessions yet.
          </p>
        ) : (
          <div className="space-y-4">
            {where.rows.map((r) => (
              <div key={r.label}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                    {r.label}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums tracking-[0.04em] text-text-primary">
                    {fmtMin(r.min)}
                  </span>
                </div>
                <div className="flex h-[6px] gap-[2px]">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-[1_0_0%] ${i < r.pct / 4 ? 'bg-text-primary' : 'bg-border'}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── LOG ───────────────────────────────────────────────────────────── */}
      <Card title={`[ LOG · ${totals.totalSessions} ]`}>
        {log.length === 0 ? (
          <p className="py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            No sessions yet — arm one to begin.
          </p>
        ) : (
          <div>
            {log.map((row, idx, arr) => (
              <div
                key={row.id}
                className={`flex items-center justify-between gap-4 py-3 ${
                  idx === arr.length - 1 ? '' : 'border-b border-border'
                }`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-[12px] tracking-[0.04em] text-text-primary">
                    {row.label}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                    {fmtDayLabel(row.date)} · {fmtMin(row.durationMin)}
                  </span>
                </div>
                <span
                  className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] ${
                    row.state === 'ABORT'
                      ? 'text-accent'
                      : row.state === 'LIVE'
                        ? 'text-text-primary'
                        : 'text-text-secondary'
                  }`}
                >
                  {row.state}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4 break-inside-avoid rounded-lg border border-border bg-surface p-6">
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
        {title}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
        {label}
      </div>
      <div className="font-mono text-[13px] tabular-nums tracking-[0.04em] text-text-primary">
        {value}
      </div>
    </div>
  );
}
