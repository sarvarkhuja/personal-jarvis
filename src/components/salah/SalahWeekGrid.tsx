import { WidgetCard } from '@/components/today/WidgetCard';
import type { WeekCellStatus, WeekDay } from '@/lib/domain/salah';

const CELL: Record<WeekCellStatus, string> = {
  on_time: 'bg-success',
  late: 'bg-warning',
  qada: 'bg-info',
  missed: 'bg-text-disabled',
  pending: 'border border-border-visible bg-transparent',
};

const ROWS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

/** 5 prayers (rows) × 7 days (cols), oldest → newest left to right. */
export function SalahWeekGrid({ week }: { week: WeekDay[] }) {
  return (
    <WidgetCard title="[ SALAH · 7 DAYS ]" testid="salah-week">
      <div className="flex flex-col gap-[3px]">
        {ROWS.map((prayer) => (
          <div key={prayer} className="flex items-center gap-[3px]">
            <span className="w-14 font-mono text-[9px] uppercase tracking-[0.06em] text-text-disabled">
              {prayer}
            </span>
            {week.map((d) => {
              const cell = d.prayers.find((p) => p.name === prayer)!;
              return (
                <div
                  key={d.date}
                  title={`${d.date} · ${prayer} · ${cell.status}`}
                  className={`h-4 flex-1 ${CELL[cell.status]} ${
                    d.isToday ? 'ring-1 ring-text-secondary' : ''
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
