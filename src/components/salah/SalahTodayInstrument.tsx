import type { PrayerCellState, SalahStatus } from '@/lib/domain/salah';

export type CellVM = {
  name: string;
  label: string;
  timeLabel: string; // 'HH:mm'
  state: PrayerCellState;
  status: SalahStatus | null;
};

const STATE_DOT: Record<PrayerCellState, string> = {
  prayed: 'bg-success',
  current: 'bg-warning',
  upcoming: 'border border-border-visible bg-transparent',
  missed: 'bg-text-disabled',
};

/** Hero: the day's five prayers as a timeline + the next-prayer readout. */
export function SalahTodayInstrument({
  dateLabel,
  cells,
  nextLabel,
  nextAt,
  nextIsTomorrow,
}: {
  dateLabel: string;
  cells: CellVM[];
  nextLabel: string | null;
  nextAt: string | null;
  nextIsTomorrow: boolean;
}) {
  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-6">
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          [ SALAH · {dateLabel} ]
        </h2>
        {nextLabel && (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            NEXT{nextIsTomorrow ? ' (TMRW)' : ''}
          </span>
        )}
      </header>

      {nextLabel && (
        <div className="mb-6 flex items-baseline gap-3">
          <span className="font-doto text-5xl font-bold leading-none tracking-tight tabular-nums text-text-display">
            {nextAt}
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
            {nextLabel}
          </span>
        </div>
      )}

      <ol className="flex flex-col gap-2.5">
        {cells.map((c) => (
          <li key={c.name} className="flex items-center gap-3">
            <span className={`size-2.5 shrink-0 rounded-full ${STATE_DOT[c.state]}`} />
            <span className="w-24 font-mono text-[12px] uppercase tracking-[0.06em] text-text-primary">
              {c.label}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-text-secondary">
              {c.timeLabel}
            </span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
              {c.state === 'prayed' ? (c.status ?? '') : c.state}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
