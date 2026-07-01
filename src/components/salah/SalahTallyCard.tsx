import { WidgetCard } from '@/components/today/WidgetCard';

export function SalahTallyCard({
  qadaCount30d,
  missedCount30d,
}: {
  qadaCount30d: number;
  missedCount30d: number;
}) {
  return (
    <WidgetCard title="[ SALAH · MAKE-UP ]" testid="salah-tally">
      <div className="flex gap-8">
        <div>
          <span className="font-doto text-3xl font-bold leading-none tabular-nums text-info">
            {qadaCount30d}
          </span>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            QADA (30D)
          </p>
        </div>
        <div>
          <span className="font-doto text-3xl font-bold leading-none tabular-nums text-text-disabled">
            {missedCount30d}
          </span>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
            MISSED (30D)
          </p>
        </div>
      </div>
    </WidgetCard>
  );
}
