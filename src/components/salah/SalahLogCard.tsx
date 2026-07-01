'use client';

import * as React from 'react';
import { WidgetCard } from '@/components/today/WidgetCard';
import { logSalah, updateSalahLog, unlogSalah } from '@/lib/actions/salah';
import type { CellVM } from '@/components/salah/SalahTodayInstrument';
import type { SalahStatus, JamaatKind } from '@/lib/domain/salah';

const STATUSES: SalahStatus[] = ['on_time', 'late', 'qada'];
const STATUS_LABEL: Record<SalahStatus, string> = {
  on_time: 'ON-TIME',
  late: 'LATE',
  qada: 'QADA',
};
const JAMAATS: JamaatKind[] = ['alone', 'jamaat', 'masjid'];

export function SalahLogCard({
  cells,
  today,
}: {
  cells: CellVM[];
  today: string;
}) {
  return (
    <WidgetCard title="[ SALAH · LOG TODAY ]" testid="salah-log">
      <ul className="flex flex-col gap-4">
        {cells.map((c) => (
          <PrayerRow key={c.name} cell={c} today={today} />
        ))}
      </ul>
    </WidgetCard>
  );
}

function PrayerRow({ cell, today }: { cell: CellVM; today: string }) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const prayer = cell.name as import('@/lib/domain/salah').PrayerName;
  const logged = cell.state === 'prayed';
  // A prayer whose window has not opened yet cannot be logged.
  const canLog = cell.state !== 'upcoming';

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setPending(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="w-24 font-mono text-[12px] uppercase tracking-[0.06em] text-text-primary">
          {cell.label}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-text-secondary">
          {cell.timeLabel}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {error && (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
              {error}
            </span>
          )}
          {!logged ? (
            <button
              type="button"
              disabled={pending || !canLog}
              onClick={() => run(() => logSalah({ prayer }))}
              data-testid={`salah-log-${prayer}`}
              className="h-8 min-w-[3rem] rounded-full bg-text-display px-3.5 font-mono text-[11px] uppercase tracking-[0.06em] text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? '…' : canLog ? 'LOG' : '—'}
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => unlogSalah({ prayer, log_date: today }))}
              data-testid={`salah-unlog-${prayer}`}
              className="h-8 rounded-full border border-border-visible px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-text-disabled transition-colors hover:text-text-primary disabled:opacity-40"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {logged && (
        <div className="flex flex-wrap items-center gap-1.5 pl-24">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => updateSalahLog({ prayer, log_date: today, status: s }))
              }
              className={`h-6 rounded-full px-2.5 font-mono text-[9px] uppercase tracking-[0.06em] transition-colors disabled:opacity-40 ${
                cell.status === s
                  ? 'bg-text-display text-background'
                  : 'border border-border-visible text-text-disabled hover:text-text-primary'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
          <span className="mx-1 text-text-disabled">·</span>
          {JAMAATS.map((j) => (
            <button
              key={j}
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => updateSalahLog({ prayer, log_date: today, jamaat: j }))
              }
              className="h-6 rounded-full border border-border-visible px-2.5 font-mono text-[9px] uppercase tracking-[0.06em] text-text-disabled transition-colors hover:text-text-primary disabled:opacity-40"
            >
              {j}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
