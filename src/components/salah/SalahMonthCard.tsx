import { WidgetCard } from '@/components/today/WidgetCard';

export function SalahMonthCard({
  onTimeRate30d,
  jamaatRate30d,
  totalLogged30d,
}: {
  onTimeRate30d: number;
  jamaatRate30d: number;
  totalLogged30d: number;
}) {
  return (
    <WidgetCard title="[ SALAH · 30 DAYS ]" testid="salah-month">
      <dl className="flex flex-col gap-3">
        <Row label="ON-TIME" value={`${Math.round(onTimeRate30d * 100)}%`} />
        <Row label="JAMAAT" value={`${Math.round(jamaatRate30d * 100)}%`} />
        <Row label="PRAYERS LOGGED" value={String(totalLogged30d)} />
      </dl>
    </WidgetCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
        {label}
      </dt>
      <dd className="font-mono text-[13px] tabular-nums text-text-primary">{value}</dd>
    </div>
  );
}
